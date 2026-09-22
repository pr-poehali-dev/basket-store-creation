import { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';

interface PosItem {
  position_id: number;
  staff_name: string;
  catalog_name?: string;
  category: string;
  weave_type?: string;
  qty: number;
  price: number;
}

interface DayRep {
  id: number;
  staff_id: number;
  report_date: string;
  positions: PosItem[];
  total_rub: number;
  hours: number;
  time_start: string;
  time_end: string;
  locked: boolean;
}

interface HbPosition {
  id: number;
  staff_name: string;
  catalog_name: string;
  weave_type: string;
  price_whole: number;
  price_whole_ears: number;
  price_no_handle: number;
  price_handle: number;
  price_ears: number;
}

const CAT_LABEL: Record<string, string> = {
  whole: 'Целая корзина с ручкой',
  whole_ears: 'Целая корзина с ушами',
  no_handle: 'Без ручки',
  handle: 'Ручки',
  ears: 'Уши',
};
const CAT_KEYS = ['whole', 'whole_ears', 'no_handle', 'handle', 'ears'] as const;
const PRICE_FIELD: Record<string, keyof HbPosition> = {
  whole: 'price_whole', whole_ears: 'price_whole_ears',
  no_handle: 'price_no_handle', handle: 'price_handle', ears: 'price_ears',
};

const num = (n: number) => (n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
const fmtDate = (d: string) => d.split('-').reverse().join('.');

interface FlatRow {
  repId: number;
  staffId: number;
  date: string;
  fio: string;
  hours: number;
  idx: number;
  isFirst: boolean;
  pos: PosItem;
}

interface Props {
  staffIds: number[];
  staffNames: Record<number, string>;
  dateFrom: string;
  dateTo: string;
}

const StaffReportData = ({ staffIds, staffNames, dateFrom, dateTo }: Props) => {
  const [reports, setReports] = useState<DayRep[]>([]);
  const [hb, setHb] = useState<HbPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState('');
  const [draftHours, setDraftHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addStaff, setAddStaff] = useState<number | null>(null);
  const [addDate, setAddDate] = useState(dateTo);
  const [addGroup, setAddGroup] = useState('');
  const [addVariant, setAddVariant] = useState('');
  const [addQtys, setAddQtys] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const all: DayRep[] = [];
    for (const sid of staffIds) {
      const res = await fetch(`${urls['reports']}?type=reports&staff_id=${sid}&from=${dateFrom}&to=${dateTo}`);
      const data = await res.json();
      all.push(...(data.reports || []));
    }
    all.sort((a, b) => a.report_date.localeCompare(b.report_date));
    setReports(all);
    setLoading(false);
  }, [staffIds, dateFrom, dateTo]);

  useEffect(() => { if (staffIds.length) load(); else { setReports([]); setLoading(false); } }, [load, staffIds.length]);
  useEffect(() => {
    fetch(`${urls['handbook']}?type=positions`).then(r => r.json()).then(d => setHb(d.positions || []));
  }, []);

  const rows: FlatRow[] = useMemo(() => {
    const out: FlatRow[] = [];
    for (const r of reports) {
      const items = (r.positions || []).filter(p => p.qty > 0);
      items.forEach((pos, i) => out.push({
        repId: r.id, staffId: r.staff_id, date: r.report_date,
        fio: staffNames[r.staff_id] || `ID ${r.staff_id}`,
        hours: r.hours, idx: i, isFirst: i === 0, pos,
      }));
    }
    return out;
  }, [reports, staffNames]);

  const saveReport = async (rep: DayRep, positions: PosItem[], hours: number) => {
    const total = positions.reduce((s, p) => s + p.qty * p.price, 0);
    await fetch(urls['reports'], {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'report', staff_id: rep.staff_id, report_date: rep.report_date,
        positions, total_rub: total, hours,
        time_start: rep.time_start, time_end: rep.time_end,
      }),
    });
  };

  const commitRow = async (row: FlatRow) => {
    const rep = reports.find(r => r.id === row.repId);
    if (!rep) return;
    setSaving(true);
    const items = (rep.positions || []).filter(p => p.qty > 0);
    const qty = Math.max(0, parseInt(draftQty, 10) || 0);
    const next = items.map((p, i) => i === row.idx ? { ...p, qty } : p).filter(p => p.qty > 0);
    const hours = draftHours === '' ? rep.hours : (parseFloat(draftHours.replace(',', '.')) || 0);
    await saveReport(rep, next, hours);
    setSaving(false);
    setEditKey(null);
    load();
  };

  const deleteRow = async (row: FlatRow) => {
    const rep = reports.find(r => r.id === row.repId);
    if (!rep) return;
    setSaving(true);
    const items = (rep.positions || []).filter(p => p.qty > 0).filter((_, i) => i !== row.idx);
    await saveReport(rep, items, rep.hours);
    setSaving(false);
    setEditKey(null);
    load();
  };

  // Позиции справочника: список названий и варианты плетения внутри названия
  const groupNames = useMemo(
    () => Array.from(new Set(hb.map(h => h.staff_name).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru')),
    [hb]);
  const variants = useMemo(() => hb.filter(h => h.staff_name === addGroup), [hb, addGroup]);
  const activeVariantId = addVariant || (variants[0] ? String(variants[0].id) : '');
  const activeVariant = variants.find(v => String(v.id) === activeVariantId) || null;

  const addPosition = async () => {
    if (!addStaff || !addDate || !activeVariant) return;
    const src = activeVariant;
    const rep = reports.find(r => r.staff_id === addStaff && r.report_date === addDate);
    setSaving(true);
    const items = [...((rep?.positions || []).filter(p => p.qty > 0))];
    for (const c of CAT_KEYS) {
      const qty = addQtys[c] || 0;
      if (!qty) continue;
      const price = Number(src[PRICE_FIELD[c]] || 0);
      const exist = items.findIndex(p => p.position_id === src.id && p.category === c);
      if (exist >= 0) items[exist] = { ...items[exist], qty: items[exist].qty + qty };
      else items.push({
        position_id: src.id, staff_name: src.staff_name, catalog_name: src.catalog_name,
        category: c, weave_type: src.weave_type, qty, price,
      });
    }
    await saveReport(
      rep || { id: 0, staff_id: addStaff, report_date: addDate, positions: [], total_rub: 0, hours: 0, time_start: '', time_end: '', locked: false },
      items, rep?.hours || 0);
    setSaving(false);
    setAddOpen(false);
    setAddGroup(''); setAddVariant(''); setAddQtys({});
    load();
  };

  const exportExcel = async () => {
    setExporting(true);
    const res = await fetch(`${urls['export-excel']}?type=reports&from=${dateFrom}&to=${dateTo}&staff_ids=${staffIds.join(',')}`);
    const data = await res.json();
    const a = document.createElement('a');
    a.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.file}`;
    a.download = data.filename || 'staff_reports.xlsx';
    a.click();
    setExporting(false);
  };

  const th = "px-3 py-2 font-semibold text-[#3d6a8a] bg-[#dceaf5] border border-white/60 whitespace-nowrap";
  const td = "px-3 py-1.5 border border-primary/15 whitespace-nowrap";

  if (loading) return <p className="text-muted-foreground">Загружаю данные...</p>;

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <button onClick={exportExcel} disabled={exporting || !rows.length}
          className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold disabled:opacity-50">
          <Icon name="Download" size={14} className="inline mr-1.5" />
          {exporting ? 'Готовлю файл...' : 'Выгрузить в Excel'}
        </button>
        <button onClick={() => { setAddOpen(true); setAddStaff(staffIds[0] ?? null); setAddDate(dateTo); }}
          className="px-4 py-1.5 rounded-xl border border-primary/40 text-primary text-sm font-semibold hover:border-primary">
          <Icon name="Plus" size={14} className="inline mr-1" />
          Добавить позицию
        </button>
        <span className="text-xs text-muted-foreground">
          Период: {fmtDate(dateFrom)} — {fmtDate(dateTo)} · строк: {rows.length}
        </span>
      </div>

      {!rows.length ? (
        <p className="text-muted-foreground">За выбранный период отчётов нет</p>
      ) : (
        <div className="overflow-x-auto border border-primary/20 rounded-xl">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className={th}>дата</th>
                <th className={th}>фио</th>
                <th className={th}>часы</th>
                <th className={`${th} text-left`}>позиция</th>
                <th className={th}>колво</th>
                <th className={th}>цена</th>
                <th className={th}>сумма</th>
                <th className={th}>руб/ч</th>
                <th className={`${th} text-left`}>ручки/без ручки</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const key = `${row.repId}-${row.idx}`;
                const editing = editKey === key;
                const rep = reports.find(r => r.id === row.repId);
                const dayTotal = (rep?.positions || []).reduce((s, p) => s + p.qty * p.price, 0);
                const perHour = rep && rep.hours > 0 ? Math.round(dayTotal / rep.hours) : 0;
                return (
                  <tr key={key} className={row.idx % 2 ? 'bg-primary/3' : ''}>
                    <td className={td}>{fmtDate(row.date)}</td>
                    <td className={`${td} font-medium text-primary`}>{row.fio}</td>
                    <td className={`${td} text-center`}>
                      {editing ? (
                        <input type="number" step="0.25" min={0} value={draftHours}
                          onChange={e => setDraftHours(e.target.value)}
                          className="w-16 text-center border border-accent rounded-md px-1 py-0.5 text-sm outline-none" />
                      ) : (row.isFirst && row.hours ? row.hours : '')}
                    </td>
                    <td className={td}>{row.pos.staff_name}</td>
                    <td className={`${td} text-center`}>
                      {editing ? (
                        <input type="number" min={0} value={draftQty} placeholder="0"
                          onChange={e => setDraftQty(e.target.value)}
                          className="w-16 text-center border border-accent rounded-md px-1 py-0.5 text-sm outline-none" />
                      ) : row.pos.qty}
                    </td>
                    <td className={`${td} text-center bg-primary/5`}>{num(row.pos.price)}</td>
                    <td className={`${td} text-right font-semibold`}>{num(row.pos.qty * row.pos.price)}</td>
                    <td className={`${td} text-center`}>{row.isFirst ? perHour : ''}</td>
                    <td className={`${td} text-muted-foreground`}>{CAT_LABEL[row.pos.category] || '---'}</td>
                    <td className={`${td} text-center`}>
                      {editing ? (
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => commitRow(row)} disabled={saving}
                            className="px-2 py-1 rounded-md bg-accent text-accent-foreground text-xs disabled:opacity-50">OK</button>
                          <button onClick={() => deleteRow(row)} disabled={saving}
                            className="px-1.5 py-1 rounded-md border border-red-300 text-red-500 text-xs">
                            <Icon name="Trash2" size={13} />
                          </button>
                          <button onClick={() => setEditKey(null)}
                            className="px-1.5 py-1 rounded-md border border-primary/30 text-xs">
                            <Icon name="X" size={13} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => {
                          setEditKey(key);
                          setDraftQty(String(row.pos.qty));
                          setDraftHours(String(row.hours || ''));
                        }} className="px-2 py-1 rounded-md border border-primary/30 text-primary hover:border-primary">
                          <Icon name="Pencil" size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Добавление забытой позиции */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setAddOpen(false)}>
          <div className="bg-background rounded-2xl border border-primary/30 p-5 w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-primary text-lg">Добавить позицию</h3>
              <button onClick={() => setAddOpen(false)} className="text-muted-foreground hover:text-primary text-xl">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Сотрудник *</label>
                <select value={addStaff ?? ''} onChange={e => setAddStaff(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent">
                  <option value="">Выберите</option>
                  {staffIds.map(id => <option key={id} value={id}>{staffNames[id]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Дата *</label>
                <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs text-muted-foreground block mb-1">Позиция *</label>
              <select value={addGroup} onChange={e => { setAddGroup(e.target.value); setAddVariant(''); setAddQtys({}); }}
                className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent">
                <option value="">Выберите позицию</option>
                {groupNames.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {variants.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {variants.map(v => (
                  <button key={v.id} onClick={() => { setAddVariant(String(v.id)); setAddQtys({}); }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                      String(v.id) === activeVariantId ? 'bg-primary text-white border-primary' : 'border-primary/30 text-primary hover:border-primary'
                    }`}>
                    {v.weave_type || 'основной'}
                  </button>
                ))}
              </div>
            )}

            {activeVariant && (
              <div className="space-y-2 mb-4">
                {CAT_KEYS.filter(c => Number(activeVariant[PRICE_FIELD[c]] || 0) > 0).map(c => {
                  const price = Number(activeVariant[PRICE_FIELD[c]] || 0);
                  const q = addQtys[c] || 0;
                  return (
                    <div key={c} className="flex items-center gap-2">
                      <span className="text-sm text-primary flex-1 min-w-0">{CAT_LABEL[c]}</span>
                      <input type="number" min={0} placeholder="0" value={q || ''}
                        onChange={e => setAddQtys(p => ({ ...p, [c]: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                        className="w-16 flex-shrink-0 text-center border border-primary/30 rounded-lg px-1 py-1.5 text-sm outline-none focus:border-accent" />
                      <span className="text-xs text-muted-foreground w-16 flex-shrink-0 text-left pl-2">{num(price)} ₽</span>
                      <span className="text-sm font-semibold w-20 flex-shrink-0 text-right text-primary">{q > 0 ? `${num(q * price)} ₽` : '—'}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={addPosition}
              disabled={saving || !addStaff || !addDate || !activeVariant || !Object.values(addQtys).some(v => v > 0)}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold disabled:opacity-50">
              {saving ? 'Сохраняю...' : 'Добавить в отчёт'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffReportData;

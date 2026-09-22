import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';

interface PosItem {
  position_id: number;
  staff_name: string;
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

const CAT_LABEL: Record<string, string> = {
  whole: 'Готовая с ручкой',
  no_handle: 'Без ручки',
  handle: 'Ручка',
  ears: 'Уши',
  whole_ears: 'Готовая с ушами',
};

const rub = (n: number) => (n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';

interface Props {
  staffIds: number[];
  staffNames: Record<number, string>;
  dateFrom: string;
  dateTo: string;
}

const StaffReportData = ({ staffIds, staffNames, dateFrom, dateTo }: Props) => {
  const [reports, setReports] = useState<DayRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRep, setOpenRep] = useState<number | null>(null);
  const [draft, setDraft] = useState<DayRep | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const all: DayRep[] = [];
    for (const sid of staffIds) {
      const res = await fetch(`${urls['reports']}?type=reports&staff_id=${sid}&from=${dateFrom}&to=${dateTo}`);
      const data = await res.json();
      all.push(...(data.reports || []));
    }
    all.sort((a, b) => b.report_date.localeCompare(a.report_date));
    setReports(all);
    setLoading(false);
  }, [staffIds, dateFrom, dateTo]);

  useEffect(() => { if (staffIds.length) load(); else { setReports([]); setLoading(false); } }, [load, staffIds.length]);

  const startEdit = (r: DayRep) => {
    setOpenRep(r.id);
    setDraft(JSON.parse(JSON.stringify(r)));
  };

  const setQty = (idx: number, qty: number) => {
    if (!draft) return;
    const pos = [...draft.positions];
    pos[idx] = { ...pos[idx], qty: Math.max(0, qty) };
    setDraft({ ...draft, positions: pos });
  };

  const removePos = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, positions: draft.positions.filter((_, i) => i !== idx) });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const total = draft.positions.reduce((s, p) => s + p.qty * p.price, 0);
    await fetch(urls['reports'], {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'report', staff_id: draft.staff_id, report_date: draft.report_date,
        positions: draft.positions.filter(p => p.qty > 0), total_rub: total,
        hours: draft.hours, time_start: draft.time_start, time_end: draft.time_end,
      }),
    });
    setSaving(false);
    setOpenRep(null);
    setDraft(null);
    load();
  };

  if (loading) return <p className="text-muted-foreground">Загружаю данные...</p>;
  if (!reports.length) return <p className="text-muted-foreground">За выбранный период отчётов нет</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        Все позиции и часы работы, внесённые сотрудниками. Нажмите на день, чтобы посмотреть и исправить отчёт.
      </p>
      {reports.map(r => {
        const isOpen = openRep === r.id;
        const view = isOpen && draft ? draft : r;
        const total = view.positions.reduce((s, p) => s + p.qty * p.price, 0);
        return (
          <div key={r.id} className="border border-primary/30 rounded-2xl overflow-hidden">
            <button onClick={() => isOpen ? (setOpenRep(null), setDraft(null)) : startEdit(r)}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/5 hover:bg-primary/8 text-left">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-primary">{staffNames[r.staff_id] || `ID ${r.staff_id}`}</span>
                <span className="text-sm text-primary/70">{r.report_date.split('-').reverse().join('.')}</span>
                <span className="text-xs text-muted-foreground">{r.time_start}–{r.time_end} · {r.hours} ч</span>
                <span className="text-sm font-bold text-primary">{rub(r.total_rub)}</span>
              </div>
              <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-primary/50" />
            </button>

            {isOpen && draft && (
              <div className="px-4 py-3">
                <div className="flex gap-3 mb-3 flex-wrap items-end">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Начало</label>
                    <input type="time" value={draft.time_start}
                      onChange={e => setDraft({ ...draft, time_start: e.target.value })}
                      className="border border-primary/30 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Окончание</label>
                    <input type="time" value={draft.time_end}
                      onChange={e => setDraft({ ...draft, time_end: e.target.value })}
                      className="border border-primary/30 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Часов</label>
                    <input type="number" step="0.1" min={0} value={draft.hours}
                      onChange={e => setDraft({ ...draft, hours: parseFloat(e.target.value) || 0 })}
                      className="w-24 border border-primary/30 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-accent" />
                  </div>
                </div>

                <div className="divide-y divide-primary/10 border-t border-primary/10">
                  {view.positions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">Позиций нет</p>
                  ) : view.positions.map((p, i) => (
                    <div key={`${p.position_id}-${p.category}-${i}`} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-primary truncate">{p.staff_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {CAT_LABEL[p.category] || p.category}{p.weave_type ? ` · ${p.weave_type}` : ''} · {p.price.toLocaleString('ru-RU')} ₽/шт
                        </div>
                      </div>
                      <input type="number" min={0} value={p.qty || ''} placeholder="0"
                        onChange={e => setQty(i, parseInt(e.target.value, 10) || 0)}
                        className="w-16 text-center border border-primary/30 rounded-lg px-1 py-1 text-sm outline-none focus:border-accent" />
                      <span className="text-sm font-semibold w-24 text-right text-primary">{rub(p.qty * p.price)}</span>
                      <button onClick={() => removePos(i)} className="text-red-400 hover:text-red-600">
                        <Icon name="Trash2" size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-primary/10 mt-1">
                  <span className="text-sm font-semibold text-primary">Итого: {rub(total)}</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setOpenRep(null); setDraft(null); }}
                      className="px-4 py-1.5 rounded-xl border border-primary/30 text-primary text-xs">Отмена</button>
                    <button onClick={save} disabled={saving}
                      className="px-5 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold disabled:opacity-50">
                      {saving ? 'Сохраняю...' : 'Сохранить'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StaffReportData;

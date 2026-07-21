import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';

interface Position {
  id: number;
  catalog_name: string;
  set_catalog_names: string;
  set_staff_names: string;
  staff_name: string;
  weave_type: string;
  price_whole: number;
  price_no_handle: number;
  price_handle: number;
  price_ears: number;
  is_active: boolean;
}

interface StaffMember { id: number; full_name: string; group_name: string; }
interface Plan { id: number; staff_id: number; full_name: string; daily_plan_rub: number; daily_plan_hours: number; valid_from: string; }

const ALL_COLUMNS = [
  { key: 'staff_name',         label: 'Название для ЗП' },
  { key: 'catalog_name',       label: 'Название в каталоге' },
  { key: 'set_catalog_names',  label: 'Набор из каталога' },
  { key: 'set_staff_names',    label: 'Набор из ЗП' },
  { key: 'weave_type',         label: 'Плетение' },
  { key: 'price_whole',        label: 'Готовая, ₽' },
  { key: 'price_no_handle',    label: 'Без ручки, ₽' },
  { key: 'price_handle',       label: 'Ручка, ₽' },
  { key: 'price_ears',         label: 'Уши, ₽' },
];
const DEFAULT_VISIBLE = ['staff_name', 'catalog_name', 'weave_type', 'price_whole', 'price_no_handle', 'price_handle', 'price_ears'];

const EMPTY_POS: Omit<Position, 'id' | 'is_active'> = {
  catalog_name: '', set_catalog_names: '', set_staff_names: '', staff_name: '',
  weave_type: '', price_whole: 0, price_no_handle: 0, price_handle: 0, price_ears: 0,
};

function fmtMonth(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return `${months[parseInt(m)]} ${y}`;
}

function getMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    opts.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7));
  }
  return opts;
}

const PRICE_KEYS = ['price_whole', 'price_no_handle', 'price_handle', 'price_ears'] as const;

const inputCls = "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
const labelCls = "text-xs uppercase tracking-wider text-muted-foreground mb-1 block";

const AdminHandbook = () => {
  const [tab, setTab] = useState<'positions' | 'plans'>('positions');
  const [positions, setPositions] = useState<Position[]>([]);
  const [plans, setPlans]         = useState<Plan[]>([]);
  const [staff, setStaff]         = useState<StaffMember[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAll, setShowAll]     = useState(false);
  const [search, setSearch]       = useState('');

  const [visibleCols, setVisibleCols] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('handbook_cols') || 'null') || DEFAULT_VISIBLE; }
    catch { return DEFAULT_VISIBLE; }
  });
  const [colsOpen, setColsOpen] = useState(false);
  const [sortCol, setSortCol]   = useState<string>('staff_name');
  const [sortAsc, setSortAsc]   = useState(true);

  const [showPosForm, setShowPosForm] = useState(false);
  const [editPosId, setEditPosId]     = useState<number | null>(null);
  const [posForm, setPosForm]         = useState({ ...EMPTY_POS });
  const [saving, setSaving]           = useState(false);

  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showPlanForm, setShowPlanForm]   = useState(false);
  const [editPlan, setEditPlan]           = useState<Plan | null>(null);
  const [planForm, setPlanForm]           = useState({ staff_id: 0, daily_plan_rub: 0, daily_plan_hours: 8, valid_from: '' });

  const monthOptions = getMonthOptions();

  const toggleCol = (key: string) => {
    const next = visibleCols.includes(key) ? visibleCols.filter(k => k !== key) : [...visibleCols, key];
    setVisibleCols(next);
    localStorage.setItem('handbook_cols', JSON.stringify(next));
  };
  const col = (key: string) => visibleCols.includes(key);

  const load = async () => {
    setLoading(true);
    try {
      const [posRes, staffRes] = await Promise.all([
        fetch(`${urls['handbook']}?type=positions${showAll ? '&all=1' : ''}`),
        fetch(`${urls['handbook']}?type=staff`),
      ]);
      const [posData, staffData] = await Promise.all([posRes.json(), staffRes.json()]);
      setPositions(posData.positions || []);
      setStaff(staffData.staff || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadPlans = async (month: string) => {
    try {
      const res  = await fetch(`${urls['handbook']}?type=plans_month&month=${month}`);
      const data = await res.json();
      setPlans(data.plans || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, [showAll]);
  useEffect(() => { if (tab === 'plans') loadPlans(selectedMonth); }, [tab, selectedMonth]);

  const openAddPos = () => { setEditPosId(null); setPosForm({ ...EMPTY_POS }); setShowPosForm(true); };
  const openEditPos = (p: Position) => {
    setEditPosId(p.id);
    setPosForm({
      catalog_name: p.catalog_name, set_catalog_names: p.set_catalog_names, set_staff_names: p.set_staff_names,
      staff_name: p.staff_name, weave_type: p.weave_type,
      price_whole: p.price_whole, price_no_handle: p.price_no_handle, price_handle: p.price_handle, price_ears: p.price_ears,
    });
    setShowPosForm(true);
  };

  const savePos = async () => {
    if (!posForm.staff_name.trim()) return;
    setSaving(true);
    if (editPosId) {
      await fetch(urls['handbook'], { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'position', id: editPosId, ...posForm }) });
    } else {
      await fetch(urls['handbook'], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'position', ...posForm }) });
    }
    setSaving(false); setShowPosForm(false); await load();
  };

  const deactivatePos = async (id: number) => { await fetch(`${urls['handbook']}?type=position&id=${id}`, { method: 'DELETE' }); await load(); };
  const restorePos    = async (id: number) => { await fetch(urls['handbook'], { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'position', id, is_active: true }) }); await load(); };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult('');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = (ev.target?.result as string).split(',')[1];
      const res  = await fetch(urls['handbook'], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'excel_positions', file: b64 }) });
      const data = await res.json();
      setImporting(false);
      setImportResult(data.error ? `Ошибка: ${data.error}` : `Создано: ${data.created}, обновлено: ${data.updated}`);
      await load();
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const savePlan = async () => {
    if (!planForm.staff_id) return;
    setSaving(true);
    await fetch(urls['handbook'], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'plan', ...planForm }) });
    setSaving(false); setShowPlanForm(false); setEditPlan(null);
    await loadPlans(selectedMonth);
  };

  const employeeStaff = staff.filter(s => s.group_name === 'Сотрудники');

  const filteredPositions = positions
    .filter(p => !search || p.staff_name.toLowerCase().includes(search.toLowerCase()) || p.catalog_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[sortCol], vb = (b as unknown as Record<string, unknown>)[sortCol];
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'ru');
      return sortAsc ? cmp : -cmp;
    });

  const hbTh = (key: string, label: string) => (
    <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-primary select-none whitespace-nowrap"
      onClick={() => { if (sortCol === key) setSortAsc(v => !v); else { setSortCol(key); setSortAsc(true); } }}>
      {label}{sortCol === key ? (sortAsc ? ' ↑' : ' ↓') : <span className="opacity-30"> ↕</span>}
    </th>
  );

  return (
    <div className="text-foreground">
      <main className="px-6 py-8">
        <h1 className="font-display text-2xl font-semibold text-primary mb-1">Справочник</h1>

        <div className="flex gap-2 mb-6 mt-4">
          {(['positions', 'plans'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${tab === t ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'}`}>
              {t === 'positions' ? 'Позиции' : 'Планы сотрудников'}
            </button>
          ))}
        </div>

        {tab === 'positions' ? (
          <>
            {/* Excel блок */}
            <div className="bg-card border border-border p-6 mb-8 rounded-2xl">
              <h2 className="font-display text-xl font-semibold mb-4">Excel</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Колонки: <code className="bg-secondary px-1">название для зп, название в каталоге, названия позиций для набора из каталога, названия позиций для набора из зп, вид плетения, цена за готовую корзину, цена за корзину без ручки, цена за ручку, цена за уши</code>
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Позиции набора перечисляются через «;». Обновление происходит по совпадению «название для зп».
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => fileRef.current?.click()} disabled={importing} className="rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Icon name="Upload" size={16} className="mr-2" />
                  {importing ? 'Загружаю...' : 'Загрузить .xlsx'}
                </Button>
                {importResult && (
                  <span className={`text-sm ${importResult.startsWith('Ошибка') ? 'text-red-500' : 'text-muted-foreground'}`}>{importResult}</span>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelImport} disabled={importing} />
            </div>

            {/* Шапка таблицы */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h2 className="font-display text-xl font-semibold">Позиции ({positions.length})</h2>
              <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                <div className="relative flex-1 sm:w-64">
                  <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию..."
                    className="w-full border border-border bg-background pl-8 pr-8 py-2 text-sm outline-none focus:border-accent rounded-lg" />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent">
                      <Icon name="X" size={13} />
                    </button>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm text-primary cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="accent-accent" />
                  Деактив.
                </label>
                <div className="relative">
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setColsOpen(v => !v)}>
                    <Icon name="SlidersHorizontal" size={14} className="mr-1.5" /> Колонки
                  </Button>
                  {colsOpen && (
                    <div className="absolute right-0 top-full mt-1 z-30 bg-background border border-border shadow-lg p-3 w-64 rounded-xl">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Показывать колонки</p>
                      <div className="space-y-1.5">
                        {ALL_COLUMNS.map(c => (
                          <label key={c.key} className="flex items-center gap-2 cursor-pointer">
                            <span className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-colors ${visibleCols.includes(c.key) ? 'bg-accent border-accent' : 'border-border hover:border-accent'}`}>
                              {visibleCols.includes(c.key) && <Icon name="Check" size={11} className="text-accent-foreground" />}
                            </span>
                            <input type="checkbox" className="hidden" checked={visibleCols.includes(c.key)} onChange={() => toggleCol(c.key)} />
                            <span className="text-sm">{c.label}</span>
                          </label>
                        ))}
                      </div>
                      <button onClick={() => { setVisibleCols(DEFAULT_VISIBLE); localStorage.setItem('handbook_cols', JSON.stringify(DEFAULT_VISIBLE)); }}
                        className="text-xs text-muted-foreground hover:text-accent mt-3">Сбросить</button>
                    </div>
                  )}
                </div>
                <Button onClick={openAddPos} className="rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground whitespace-nowrap">
                  <Icon name="Plus" size={16} className="mr-2" /> Добавить
                </Button>
              </div>
            </div>

            {loading ? (
              <p className="text-muted-foreground">Загружаю...</p>
            ) : filteredPositions.length === 0 ? (
              <p className="text-muted-foreground">Позиций пока нет. Добавьте вручную или загрузите Excel.</p>
            ) : (
              <div className="border border-border overflow-x-auto rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 border-b border-border">
                    <tr>
                      {ALL_COLUMNS.map(c => col(c.key) && (
                        c.key.startsWith('price_')
                          ? <th key={c.key} className="text-right px-4 py-3 font-medium cursor-pointer hover:text-primary select-none whitespace-nowrap"
                              onClick={() => { if (sortCol === c.key) setSortAsc(v => !v); else { setSortCol(c.key); setSortAsc(true); } }}>
                              {c.label}{sortCol === c.key ? (sortAsc ? ' ↑' : ' ↓') : <span className="opacity-30"> ↕</span>}
                            </th>
                          : <th key={c.key}>{hbTh(c.key, c.label)}</th>
                      ))}
                      <th className="text-center px-4 py-3 font-medium w-36"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPositions.map(pos => (
                      <tr key={pos.id} className={`border-b border-border last:border-0 hover:bg-secondary/20 ${!pos.is_active ? 'opacity-40' : ''}`}>
                        {col('staff_name')        && <td className="px-4 py-3 font-medium">{pos.staff_name}</td>}
                        {col('catalog_name')      && <td className="px-4 py-3 text-muted-foreground">{pos.catalog_name || '—'}</td>}
                        {col('set_catalog_names') && <td className="px-4 py-3 text-muted-foreground text-xs">{pos.set_catalog_names || '—'}</td>}
                        {col('set_staff_names')   && <td className="px-4 py-3 text-muted-foreground text-xs">{pos.set_staff_names || '—'}</td>}
                        {col('weave_type')        && <td className="px-4 py-3 text-muted-foreground">{pos.weave_type || '—'}</td>}
                        {PRICE_KEYS.map(k => col(k) && (
                          <td key={k} className="px-4 py-3 text-right font-bold">{pos[k] ? `${pos[k].toLocaleString('ru-RU')} ₽` : '—'}</td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            <Button size="sm" variant="outline" className="rounded-lg h-8" onClick={() => openEditPos(pos)}>
                              <Icon name="Pencil" size={14} />
                            </Button>
                            {pos.is_active
                              ? <Button size="sm" variant="outline" className="rounded-lg h-8 text-red-500 hover:text-red-600" onClick={() => deactivatePos(pos.id)}>
                                  <Icon name="Trash2" size={14} />
                                </Button>
                              : <Button size="sm" variant="outline" className="rounded-lg h-8" onClick={() => restorePos(pos.id)}>
                                  <Icon name="RotateCcw" size={14} />
                                </Button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                className="border border-border bg-background rounded-xl px-3 py-2 text-sm outline-none focus:border-accent">
                {monthOptions.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
              </select>
              <Button onClick={() => { setPlanForm({ staff_id: 0, daily_plan_rub: 0, daily_plan_hours: 8, valid_from: selectedMonth + '-01' }); setEditPlan(null); setShowPlanForm(true); }}
                className="rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground">
                <Icon name="Plus" size={16} className="mr-2" /> Установить план
              </Button>
              <span className="text-xs text-muted-foreground">План действует с указанной даты, предыдущие месяцы считаются по старому плану</span>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Сотрудник</th>
                    <th className="text-right px-4 py-3 font-medium">План/день, ₽</th>
                    <th className="text-right px-4 py-3 font-medium">Часов/день</th>
                    <th className="text-center px-4 py-3 font-medium">Действует с</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {employeeStaff.map(s => {
                    const plan = plans.find(p => p.staff_id === s.id);
                    return (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                        <td className="px-4 py-3 font-medium">{s.full_name}</td>
                        <td className="px-4 py-3 text-right font-bold">{plan ? plan.daily_plan_rub.toLocaleString('ru-RU') : <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{plan ? plan.daily_plan_hours : '—'}</td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">{plan?.valid_from ? new Date(plan.valid_from + 'T00:00:00').toLocaleDateString('ru-RU') : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <Button size="sm" variant="outline" className="rounded-lg h-8" onClick={() => {
                            setPlanForm({ staff_id: s.id, daily_plan_rub: plan?.daily_plan_rub || 0, daily_plan_hours: plan?.daily_plan_hours || 8, valid_from: selectedMonth + '-01' });
                            setEditPlan(plan || null);
                            setShowPlanForm(true);
                          }}>
                            <Icon name="Pencil" size={14} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {employeeStaff.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Нет сотрудников</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {colsOpen && <div className="fixed inset-0 z-20" onClick={() => setColsOpen(false)} />}

      {/* ФОРМА ПОЗИЦИИ */}
      {showPosForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={e => e.target === e.currentTarget && setShowPosForm(false)}>
          <div className="bg-background border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-2xl font-semibold">{editPosId ? 'Редактировать' : 'Новая позиция'}</h3>
              <button onClick={() => setShowPosForm(false)}><Icon name="X" size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Название для ЗП *</label>
                <input value={posForm.staff_name} onChange={e => setPosForm(f => ({...f, staff_name: e.target.value}))} placeholder="напр. Анталия 50/33" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Название в каталоге</label>
                <input value={posForm.catalog_name} onChange={e => setPosForm(f => ({...f, catalog_name: e.target.value}))} placeholder="напр. АНТАЛИЯ 3 (50/33 см)" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Названия позиций для набора из каталога (через ;)</label>
                <input value={posForm.set_catalog_names} onChange={e => setPosForm(f => ({...f, set_catalog_names: e.target.value}))} placeholder="Италия 1;Италия 2;Италия 3;Италия 4" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Названия позиций для набора из ЗП (через ;)</label>
                <input value={posForm.set_staff_names} onChange={e => setPosForm(f => ({...f, set_staff_names: e.target.value}))} placeholder="Италия 1;Италия 2;Италия 3;Италия 4" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Вид плетения</label>
                <input value={posForm.weave_type} onChange={e => setPosForm(f => ({...f, weave_type: e.target.value}))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {ALL_COLUMNS.filter(c => c.key.startsWith('price_')).map(c => (
                  <div key={c.key}>
                    <label className={labelCls}>{c.label}</label>
                    <input type="number" min={0} value={posForm[c.key as keyof typeof posForm] as number}
                      onChange={e => setPosForm(f => ({...f, [c.key]: parseFloat(e.target.value) || 0}))} className={inputCls} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={savePos} disabled={saving || !posForm.staff_name.trim()} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg">
                {saving ? 'Сохраняю...' : editPosId ? 'Сохранить' : 'Добавить'}
              </Button>
              <Button variant="outline" className="rounded-lg" onClick={() => setShowPosForm(false)}>Отмена</Button>
            </div>
          </div>
        </div>
      )}

      {/* ФОРМА ПЛАНА */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={e => e.target === e.currentTarget && setShowPlanForm(false)}>
          <div className="bg-background border border-border w-full max-w-sm p-6 rounded-2xl">
            <h3 className="font-display text-2xl font-semibold mb-6">{editPlan ? 'Изменить план' : 'Установить план'}</h3>
            <div className="space-y-4">
              {!editPlan && (
                <div>
                  <label className={labelCls}>Сотрудник *</label>
                  <select value={planForm.staff_id} onChange={e => setPlanForm(f => ({...f, staff_id: Number(e.target.value)}))} className={inputCls}>
                    <option value={0}>— выберите —</option>
                    {employeeStaff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className={labelCls}>Дневной план, ₽</label>
                <input type="number" min={0} value={planForm.daily_plan_rub} onChange={e => setPlanForm(f => ({...f, daily_plan_rub: parseFloat(e.target.value)||0}))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Часов в день</label>
                <input type="number" min={0} max={24} step={0.5} value={planForm.daily_plan_hours} onChange={e => setPlanForm(f => ({...f, daily_plan_hours: parseFloat(e.target.value)||0}))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Действует с</label>
                <input type="date" value={planForm.valid_from} onChange={e => setPlanForm(f => ({...f, valid_from: e.target.value}))} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={savePlan} disabled={saving || (!editPlan && !planForm.staff_id)} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg">
                {saving ? 'Сохраняю...' : 'Сохранить'}
              </Button>
              <Button variant="outline" className="rounded-lg" onClick={() => { setShowPlanForm(false); setEditPlan(null); }}>Отмена</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHandbook;

import { useState, useEffect, useRef } from 'react';
import urls from '../../../backend/func2url.json';

const CATEGORIES = [
  { key: 'whole',     label: 'Целая корзина с ручкой' },
  { key: 'no_handle', label: 'Без ручки' },
  { key: 'handle',    label: 'Ручка' },
];

interface Position {
  id: number;
  staff_name: string;
  category: string;
  basket_group: string;
  catalog_name: string;
  price: number;
  is_active: boolean;
}

interface PriceHistory {
  id: number;
  position_id: number;
  staff_name: string;
  price: number;
  valid_from: string;
}

interface StaffMember {
  id: number;
  full_name: string;
  group_name: string;
}

interface Plan {
  id: number;
  staff_id: number;
  full_name: string;
  daily_plan_rub: number;
  daily_plan_hours: number;
  valid_from: string;
}

const EMPTY_POS: Omit<Position, 'id' | 'is_active'> = {
  staff_name: '', category: 'whole', basket_group: '', catalog_name: '', price: 0,
};

const catLabel = (key: string) => CATEGORIES.find(c => c.key === key)?.label || key;

function groupByBasket(positions: Position[]): Record<string, Position[]> {
  const map: Record<string, Position[]> = {};
  for (const p of positions) {
    if (!map[p.basket_group]) map[p.basket_group] = [];
    map[p.basket_group].push(p);
  }
  return map;
}

function fmtMonth(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return `${months[parseInt(m)]} ${y}`;
}

// Список месяцев: текущий и 11 предыдущих
function getMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push(d.toISOString().slice(0, 7));
  }
  return opts;
}

const AdminHandbook = () => {
  const [tab, setTab] = useState<'positions' | 'plans'>('positions');
  const [positions, setPositions]   = useState<Position[]>([]);
  const [plans, setPlans]           = useState<Plan[]>([]);
  const [staff, setStaff]           = useState<StaffMember[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAll, setShowAll]       = useState(false);

  // Позиции
  const [showPosForm, setShowPosForm] = useState(false);
  const [editPosId, setEditPosId]     = useState<number | null>(null);
  const [posForm, setPosForm]         = useState({ ...EMPTY_POS });
  const [saving, setSaving]           = useState(false);

  // История цен
  const [showHistory, setShowHistory]   = useState(false);
  const [historyPos, setHistoryPos]     = useState<Position | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [newPrice, setNewPrice]         = useState(0);
  const [newPriceDate, setNewPriceDate] = useState('');

  // Excel импорт
  const [importing, setImporting]     = useState(false);
  const [importResult, setImportResult] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Планы
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showPlanForm, setShowPlanForm]   = useState(false);
  const [editPlan, setEditPlan]           = useState<Plan | null>(null);
  const [planForm, setPlanForm]           = useState({ staff_id: 0, daily_plan_rub: 0, daily_plan_hours: 8, valid_from: '' });

  const monthOptions = getMonthOptions();

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

  // Позиции — crud
  const openAddPos = () => { setEditPosId(null); setPosForm({ ...EMPTY_POS }); setShowPosForm(true); };
  const openEditPos = (p: Position) => { setEditPosId(p.id); setPosForm({ staff_name: p.staff_name, category: p.category, basket_group: p.basket_group, catalog_name: p.catalog_name, price: p.price }); setShowPosForm(true); };

  const savePos = async () => {
    if (!posForm.staff_name.trim() || !posForm.basket_group.trim()) return;
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

  // История цен
  const openHistory = async (pos: Position) => {
    setHistoryPos(pos);
    setNewPrice(pos.price);
    setNewPriceDate(new Date().toISOString().slice(0, 10));
    const res  = await fetch(`${urls['handbook']}?type=price_history&position_id=${pos.id}`);
    const data = await res.json();
    setPriceHistory(data.history || []);
    setShowHistory(true);
  };

  const savePrice = async () => {
    if (!historyPos) return;
    setSaving(true);
    await fetch(urls['handbook'], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'price_change', position_id: historyPos.id, price: newPrice, valid_from: newPriceDate }) });
    setSaving(false); setShowPriceForm(false);
    await openHistory(historyPos);
    await load();
  };

  // Excel импорт
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

  // Планы
  const savePlan = async () => {
    if (!planForm.staff_id) return;
    setSaving(true);
    await fetch(urls['handbook'], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'plan', ...planForm }) });
    setSaving(false); setShowPlanForm(false); setEditPlan(null);
    await loadPlans(selectedMonth);
  };

  const grouped = groupByBasket(positions);
  const basketGroups = Object.keys(grouped).sort();

  // Объединяем: все сотрудники из группы "Сотрудники" + планы
  const employeeStaff = staff.filter(s => s.group_name === 'Сотрудники');

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="font-display text-2xl font-semibold text-primary mb-1">Справочник</h1>

      {/* Вкладки */}
      <div className="flex gap-2 mb-6">
        {(['positions', 'plans'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${tab === t ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'}`}>
            {t === 'positions' ? 'Позиции' : 'Планы сотрудников'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-muted-foreground">Загружаю...</p> : tab === 'positions' ? (
        <>
          {/* Тулбар */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <button onClick={openAddPos} className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors">
              + Добавить позицию
            </button>

            {/* Excel импорт */}
            <label className={`px-4 py-2 rounded-xl border border-primary/40 text-primary text-sm cursor-pointer hover:border-primary transition-colors ${importing ? 'opacity-50' : ''}`}>
              {importing ? 'Загружаю...' : '📥 Импорт Excel'}
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelImport} disabled={importing} />
            </label>

            <label className="flex items-center gap-2 text-sm text-primary cursor-pointer">
              <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="accent-accent" />
              Показать деактивированные
            </label>
            <span className="text-sm text-muted-foreground ml-auto">{positions.length} поз. · {basketGroups.length} корзин</span>
          </div>

          {importResult && (
            <div className={`mb-3 px-4 py-2 rounded-xl text-sm ${importResult.startsWith('Ошибка') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-[#f0f4e8] text-[#5a6a2a] border border-[#c8d8b0]'}`}>
              {importResult}
            </div>
          )}

          {/* Подсказка по формату Excel */}
          <details className="mb-4">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-primary">Формат файла Excel для импорта</summary>
            <div className="mt-2 p-3 bg-primary/5 rounded-xl text-xs text-primary/70 space-y-1">
              <p>Колонки: <strong>название</strong>, <strong>корзина</strong>, <strong>категория</strong>, <strong>каталог</strong>, <strong>цена</strong></p>
              <p>Категории: whole (целая), no_handle (без ручки), handle (ручка)</p>
              <p>Обновление по совпадению «название + корзина»</p>
            </div>
          </details>

          {basketGroups.length === 0 ? (
            <p className="text-muted-foreground">Позиций пока нет. Добавьте первую или загрузите Excel.</p>
          ) : (
            <div className="space-y-4">
              {basketGroups.map(group => (
                <div key={group} className="border border-primary/30 rounded-2xl overflow-hidden">
                  <div className="bg-primary/5 px-4 py-2.5 flex items-center justify-between border-b border-primary/20">
                    <span className="font-bold text-primary">{group}</span>
                    <span className="text-xs text-muted-foreground">{grouped[group].length} позиций</span>
                  </div>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-primary/3 text-xs text-primary/70">
                        <th className="px-3 py-2 text-left font-semibold border-b border-primary/10">Название</th>
                        <th className="px-3 py-2 text-left font-semibold border-b border-primary/10">Категория</th>
                        <th className="px-3 py-2 text-left font-semibold border-b border-primary/10">В каталоге</th>
                        <th className="px-3 py-2 text-right font-semibold border-b border-primary/10">Цена, ₽</th>
                        <th className="px-3 py-2 text-center font-semibold border-b border-primary/10 w-28"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[group].map(pos => (
                        <tr key={pos.id} className={`border-b border-primary/10 last:border-0 hover:bg-primary/3 ${!pos.is_active ? 'opacity-40' : ''}`}>
                          <td className="px-3 py-2 text-primary font-medium">{pos.staff_name}</td>
                          <td className="px-3 py-2 text-primary/70">{catLabel(pos.category)}</td>
                          <td className="px-3 py-2 text-primary/60">{pos.catalog_name || '—'}</td>
                          <td className="px-3 py-2 text-primary font-bold text-right">{pos.price.toLocaleString('ru-RU')}</td>
                          <td className="px-3 py-2 text-center flex gap-1 justify-center">
                            <button onClick={() => openEditPos(pos)} className="text-xs text-primary/60 hover:text-primary underline">Изм.</button>
                            <button onClick={() => openHistory(pos)} className="text-xs text-blue-500 hover:text-blue-700 underline">История цен</button>
                            {pos.is_active
                              ? <button onClick={() => deactivatePos(pos.id)} className="text-xs text-red-400 hover:text-red-600 underline">Откл.</button>
                              : <button onClick={() => restorePos(pos.id)} className="text-xs text-primary/60 hover:text-primary underline">Вкл.</button>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ПЛАНЫ СОТРУДНИКОВ */
        <div>
          {/* Выбор месяца */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent">
              {monthOptions.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
            <button onClick={() => { setPlanForm({ staff_id: 0, daily_plan_rub: 0, daily_plan_hours: 8, valid_from: selectedMonth + '-01' }); setEditPlan(null); setShowPlanForm(true); }}
              className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors">
              + Установить план
            </button>
            <span className="text-xs text-muted-foreground">План действует с указанной даты, предыдущие месяцы считаются по старому плану</span>
          </div>

          {/* Таблица со всеми сотрудниками */}
          <div className="border border-primary/30 rounded-2xl overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-primary/5 text-xs text-primary/70 border-b border-primary/20">
                  <th className="px-4 py-2.5 text-left font-semibold">Сотрудник</th>
                  <th className="px-4 py-2.5 text-right font-semibold">План/день, ₽</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Часов/день</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Действует с</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {employeeStaff.map(s => {
                  const plan = plans.find(p => p.staff_id === s.id);
                  return (
                    <tr key={s.id} className="border-b border-primary/10 last:border-0 hover:bg-primary/3">
                      <td className="px-4 py-2.5 text-primary font-medium">{s.full_name}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-primary">
                        {plan ? plan.daily_plan_rub.toLocaleString('ru-RU') : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-primary/70">
                        {plan ? plan.daily_plan_hours : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                        {plan?.valid_from ? new Date(plan.valid_from + 'T00:00:00').toLocaleDateString('ru-RU') : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button onClick={() => {
                          setPlanForm({ staff_id: s.id, daily_plan_rub: plan?.daily_plan_rub || 0, daily_plan_hours: plan?.daily_plan_hours || 8, valid_from: selectedMonth + '-01' });
                          setEditPlan(plan || null);
                          setShowPlanForm(true);
                        }} className="text-xs text-primary/60 hover:text-primary underline">
                          {plan ? 'Изменить' : 'Задать'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {employeeStaff.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground text-sm">Нет сотрудников в группе «Сотрудники»</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ФОРМА ПОЗИЦИИ */}
      {showPosForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPosForm(false)}>
          <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-primary text-lg mb-4">{editPosId ? 'Редактировать' : 'Новая позиция'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Название для сотрудников *</label>
                <input value={posForm.staff_name} onChange={e => setPosForm(f => ({...f, staff_name: e.target.value}))} placeholder="напр. Анталия 50/33" className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Корзина *</label>
                <input value={posForm.basket_group} onChange={e => setPosForm(f => ({...f, basket_group: e.target.value}))} placeholder="напр. Анталия" className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Категория</label>
                <select value={posForm.category} onChange={e => setPosForm(f => ({...f, category: e.target.value}))} className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent">
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Название в каталоге</label>
                <input value={posForm.catalog_name} onChange={e => setPosForm(f => ({...f, catalog_name: e.target.value}))} placeholder="напр. АНТАЛИЯ 3 (50/33 см)" className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Цена за единицу, ₽</label>
                <input type="number" min={0} value={posForm.price} onChange={e => setPosForm(f => ({...f, price: parseFloat(e.target.value) || 0}))} className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={savePos} disabled={saving || !posForm.staff_name.trim() || !posForm.basket_group.trim()} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Сохраняю...' : editPosId ? 'Сохранить' : 'Добавить'}
              </button>
              <button onClick={() => setShowPosForm(false)} className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* ИСТОРИЯ ЦЕН */}
      {showHistory && historyPos && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
          <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-primary text-lg">История цен</h3>
                <p className="text-sm text-muted-foreground">{historyPos.staff_name} — {historyPos.basket_group}</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-primary text-xl">✕</button>
            </div>

            {!showPriceForm ? (
              <button onClick={() => setShowPriceForm(true)} className="mb-4 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 w-fit">
                + Изменить цену
              </button>
            ) : (
              <div className="mb-4 p-4 bg-primary/5 rounded-xl space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">Новая цена, ₽</label>
                    <input type="number" min={0} value={newPrice} onChange={e => setNewPrice(parseFloat(e.target.value)||0)} className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">Действует с</label>
                    <input type="date" value={newPriceDate} onChange={e => setNewPriceDate(e.target.value)} className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={savePrice} disabled={saving} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2 rounded-xl text-sm disabled:opacity-50">
                    {saving ? 'Сохраняю...' : 'Сохранить'}
                  </button>
                  <button onClick={() => setShowPriceForm(false)} className="px-4 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
                </div>
              </div>
            )}

            <div className="overflow-y-auto flex-1">
              {priceHistory.length === 0 ? <p className="text-sm text-muted-foreground">История пуста</p> : (
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-background">
                    <tr className="text-xs text-primary/60 border-b border-primary/20">
                      <th className="pb-2 text-left">Цена, ₽</th>
                      <th className="pb-2 text-left">Действует с</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.map((h, i) => (
                      <tr key={h.id} className="border-b border-primary/10 last:border-0">
                        <td className={`py-2 font-bold ${i === 0 ? 'text-primary' : 'text-primary/50'}`}>
                          {h.price.toLocaleString('ru-RU')} ₽
                          {i === 0 && <span className="ml-2 text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">текущая</span>}
                        </td>
                        <td className="py-2 text-primary/70">
                          {h.valid_from ? new Date(h.valid_from + 'T00:00:00').toLocaleDateString('ru-RU') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ФОРМА ПЛАНА */}
      {showPlanForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPlanForm(false)}>
          <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-primary text-lg mb-4">
              {editPlan ? 'Изменить план' : 'Установить план'}
            </h3>
            <div className="space-y-3">
              {!editPlan && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Сотрудник *</label>
                  <select value={planForm.staff_id} onChange={e => setPlanForm(f => ({...f, staff_id: Number(e.target.value)}))} className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent">
                    <option value={0}>— выберите —</option>
                    {employeeStaff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Дневной план, ₽</label>
                <input type="number" min={0} value={planForm.daily_plan_rub} onChange={e => setPlanForm(f => ({...f, daily_plan_rub: parseFloat(e.target.value)||0}))} className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Часов в день</label>
                <input type="number" min={0} max={24} step={0.5} value={planForm.daily_plan_hours} onChange={e => setPlanForm(f => ({...f, daily_plan_hours: parseFloat(e.target.value)||0}))} className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Действует с</label>
                <input type="date" value={planForm.valid_from} onChange={e => setPlanForm(f => ({...f, valid_from: e.target.value}))} className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={savePlan} disabled={saving || (!editPlan && !planForm.staff_id)} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Сохраняю...' : 'Сохранить'}
              </button>
              <button onClick={() => { setShowPlanForm(false); setEditPlan(null); }} className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHandbook;
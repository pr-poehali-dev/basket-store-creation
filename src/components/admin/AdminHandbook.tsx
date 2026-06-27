import { useState, useEffect } from 'react';
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
  daily_plan_qty: number;
  valid_from: string;
}

const EMPTY_POS: Omit<Position, 'id' | 'is_active'> = {
  staff_name: '', category: 'whole', basket_group: '', catalog_name: '', price: 0,
};

const catLabel = (key: string) => CATEGORIES.find(c => c.key === key)?.label || key;

// Группировка позиций по basket_group
function groupByBasket(positions: Position[]): Record<string, Position[]> {
  const map: Record<string, Position[]> = {};
  for (const p of positions) {
    if (!map[p.basket_group]) map[p.basket_group] = [];
    map[p.basket_group].push(p);
  }
  return map;
}

const AdminHandbook = () => {
  const [tab, setTab] = useState<'positions' | 'plans'>('positions');
  const [positions, setPositions] = useState<Position[]>([]);
  const [plans, setPlans]         = useState<Plan[]>([]);
  const [staff, setStaff]         = useState<StaffMember[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAll, setShowAll]     = useState(false);

  // Форма позиции
  const [showPosForm, setShowPosForm] = useState(false);
  const [editPosId, setEditPosId]     = useState<number | null>(null);
  const [posForm, setPosForm]         = useState({ ...EMPTY_POS });
  const [saving, setSaving]           = useState(false);

  // Форма плана
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({
    staff_id: 0, daily_plan_rub: 0, daily_plan_hours: 8, daily_plan_qty: 0, valid_from: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [posRes, planRes, staffRes] = await Promise.all([
        fetch(`${urls['handbook']}?type=positions${showAll ? '&all=1' : ''}`),
        fetch(`${urls['handbook']}?type=plans`),
        fetch(`${urls['handbook']}?type=staff`),
      ]);
      const [posData, planData, staffData] = await Promise.all([
        posRes.json(), planRes.json(), staffRes.json(),
      ]);
      setPositions(posData.positions || []);
      setPlans(planData.plans || []);
      setStaff(staffData.staff || []);
    } catch { /* backend не отвечает */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [showAll]);

  const openAddPos = () => {
    setEditPosId(null);
    setPosForm({ ...EMPTY_POS });
    setShowPosForm(true);
  };

  const openEditPos = (p: Position) => {
    setEditPosId(p.id);
    setPosForm({ staff_name: p.staff_name, category: p.category, basket_group: p.basket_group, catalog_name: p.catalog_name, price: p.price });
    setShowPosForm(true);
  };

  const savePos = async () => {
    if (!posForm.staff_name.trim() || !posForm.basket_group.trim()) return;
    setSaving(true);
    if (editPosId) {
      await fetch(urls['handbook'], {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'position', id: editPosId, ...posForm }),
      });
    } else {
      await fetch(urls['handbook'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'position', ...posForm }),
      });
    }
    setSaving(false);
    setShowPosForm(false);
    await load();
  };

  const deactivatePos = async (id: number) => {
    await fetch(`${urls['handbook']}?type=position&id=${id}`, { method: 'DELETE' });
    await load();
  };

  const restorePos = async (id: number) => {
    await fetch(urls['handbook'], {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'position', id, is_active: true }),
    });
    await load();
  };

  const savePlan = async () => {
    if (!planForm.staff_id) return;
    setSaving(true);
    await fetch(urls['handbook'], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'plan', ...planForm }),
    });
    setSaving(false);
    setShowPlanForm(false);
    await load();
  };

  const grouped = groupByBasket(positions);
  const basketGroups = Object.keys(grouped).sort();

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="font-display text-2xl font-semibold text-primary mb-1">Справочник</h1>

      {/* Вкладки */}
      <div className="flex gap-2 mb-6">
        {(['positions', 'plans'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
              tab === t ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'
            }`}>
            {t === 'positions' ? 'Позиции' : 'Планы сотрудников'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Загружаю...</p>
      ) : tab === 'positions' ? (
        <>
          {/* Тулбар */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={openAddPos}
              className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors">
              + Добавить позицию
            </button>
            <label className="flex items-center gap-2 text-sm text-primary cursor-pointer">
              <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="accent-accent" />
              Показать деактивированные
            </label>
            <span className="text-sm text-muted-foreground ml-auto">
              {positions.length} поз. · {basketGroups.length} корзин
            </span>
          </div>

          {/* Таблица сгруппированная по корзинам */}
          {basketGroups.length === 0 ? (
            <p className="text-muted-foreground">Позиций пока нет. Добавьте первую.</p>
          ) : (
            <div className="space-y-4">
              {basketGroups.map(group => (
                <div key={group} className="border border-primary/30 rounded-2xl overflow-hidden">
                  {/* Заголовок корзины */}
                  <div className="bg-primary/5 px-4 py-2.5 flex items-center justify-between border-b border-primary/20">
                    <span className="font-bold text-primary">{group}</span>
                    <span className="text-xs text-muted-foreground">{grouped[group].length} позиций</span>
                  </div>
                  {/* Строки */}
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-primary/3 text-xs text-primary/70">
                        <th className="px-3 py-2 text-left font-semibold border-b border-primary/10">Название (для сотрудников)</th>
                        <th className="px-3 py-2 text-left font-semibold border-b border-primary/10">Категория</th>
                        <th className="px-3 py-2 text-left font-semibold border-b border-primary/10">Название в каталоге</th>
                        <th className="px-3 py-2 text-right font-semibold border-b border-primary/10">Цена, ₽</th>
                        <th className="px-3 py-2 text-center font-semibold border-b border-primary/10 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[group].map(pos => (
                        <tr key={pos.id} className={`border-b border-primary/10 last:border-0 hover:bg-primary/3 ${!pos.is_active ? 'opacity-40' : ''}`}>
                          <td className="px-3 py-2 text-primary font-medium">{pos.staff_name}</td>
                          <td className="px-3 py-2 text-primary/70">{catLabel(pos.category)}</td>
                          <td className="px-3 py-2 text-primary/60">{pos.catalog_name || '—'}</td>
                          <td className="px-3 py-2 text-primary font-bold text-right">{pos.price.toLocaleString('ru-RU')}</td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => openEditPos(pos)} className="text-xs text-primary/60 hover:text-primary underline mr-2">Изм.</button>
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
        <>
          {/* ПЛАНЫ */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => { setPlanForm({ staff_id: 0, daily_plan_rub: 0, daily_plan_hours: 8, daily_plan_qty: 0, valid_from: '' }); setShowPlanForm(true); }}
              className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors">
              + Установить план
            </button>
            <span className="text-xs text-muted-foreground">При изменении плана старые данные сохраняются, новый план действует с указанной даты</span>
          </div>

          {plans.length === 0 ? (
            <p className="text-muted-foreground">Планы не заданы.</p>
          ) : (
            <div className="border border-primary/30 rounded-2xl overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary/5 text-xs text-primary/70">
                    <th className="px-4 py-2.5 text-left font-semibold border-b border-primary/20">Сотрудник</th>
                    <th className="px-4 py-2.5 text-right font-semibold border-b border-primary/20">План/день, ₽</th>
                    <th className="px-4 py-2.5 text-right font-semibold border-b border-primary/20">Часов/день</th>
                    <th className="px-4 py-2.5 text-right font-semibold border-b border-primary/20">Шт/день</th>
                    <th className="px-4 py-2.5 text-center font-semibold border-b border-primary/20">Действует с</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map(plan => (
                    <tr key={plan.id} className="border-b border-primary/10 last:border-0 hover:bg-primary/3">
                      <td className="px-4 py-2 text-primary font-medium">{plan.full_name}</td>
                      <td className="px-4 py-2 text-primary font-bold text-right">{plan.daily_plan_rub.toLocaleString('ru-RU')}</td>
                      <td className="px-4 py-2 text-primary/70 text-right">{plan.daily_plan_hours}</td>
                      <td className="px-4 py-2 text-primary/70 text-right">{plan.daily_plan_qty || '—'}</td>
                      <td className="px-4 py-2 text-primary/60 text-center">{plan.valid_from ? new Date(plan.valid_from + 'T00:00:00').toLocaleDateString('ru-RU') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ФОРМА ПОЗИЦИИ */}
      {showPosForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPosForm(false)}>
          <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-primary text-lg mb-4">{editPosId ? 'Редактировать позицию' : 'Новая позиция'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Название для сотрудников *</label>
                <input value={posForm.staff_name} onChange={e => setPosForm(f => ({...f, staff_name: e.target.value}))}
                  placeholder="напр. Анталия 50/33" className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Корзина (группировка) *</label>
                <input value={posForm.basket_group} onChange={e => setPosForm(f => ({...f, basket_group: e.target.value}))}
                  placeholder="напр. Анталия" className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Категория</label>
                <select value={posForm.category} onChange={e => setPosForm(f => ({...f, category: e.target.value}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent">
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Название в каталоге (для склада)</label>
                <input value={posForm.catalog_name} onChange={e => setPosForm(f => ({...f, catalog_name: e.target.value}))}
                  placeholder="напр. АНТАЛИЯ 3 (50/33 см)" className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Цена за единицу, ₽</label>
                <input type="number" min={0} value={posForm.price} onChange={e => setPosForm(f => ({...f, price: parseFloat(e.target.value) || 0}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={savePos} disabled={saving || !posForm.staff_name.trim() || !posForm.basket_group.trim()}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Сохраняю...' : editPosId ? 'Сохранить' : 'Добавить'}
              </button>
              <button onClick={() => setShowPosForm(false)} className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* ФОРМА ПЛАНА */}
      {showPlanForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPlanForm(false)}>
          <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-primary text-lg mb-4">Установить план</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Сотрудник *</label>
                <select value={planForm.staff_id} onChange={e => setPlanForm(f => ({...f, staff_id: Number(e.target.value)}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent">
                  <option value={0}>— выберите сотрудника —</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Дневной план, ₽</label>
                <input type="number" min={0} value={planForm.daily_plan_rub}
                  onChange={e => setPlanForm(f => ({...f, daily_plan_rub: parseFloat(e.target.value) || 0}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Часов в день</label>
                <input type="number" min={0} max={24} step={0.5} value={planForm.daily_plan_hours}
                  onChange={e => setPlanForm(f => ({...f, daily_plan_hours: parseFloat(e.target.value) || 0}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Штук в день (необязательно)</label>
                <input type="number" min={0} value={planForm.daily_plan_qty}
                  onChange={e => setPlanForm(f => ({...f, daily_plan_qty: parseInt(e.target.value) || 0}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Действует с (по умолчанию — сегодня)</label>
                <input type="date" value={planForm.valid_from}
                  onChange={e => setPlanForm(f => ({...f, valid_from: e.target.value}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={savePlan} disabled={saving || !planForm.staff_id}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Сохраняю...' : 'Установить'}
              </button>
              <button onClick={() => setShowPlanForm(false)} className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHandbook;

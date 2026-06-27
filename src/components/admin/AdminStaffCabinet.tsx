import { useState, useEffect, useCallback } from 'react';
import urls from '../../../backend/func2url.json';

export interface AuthData {
  is_admin: boolean;
  staff_id?: number;
  full_name?: string;
  pages: string[];
}

function getAuthFromSession(): AuthData {
  try {
    const raw = sessionStorage.getItem('admin_auth');
    if (raw) return JSON.parse(raw) as AuthData;
  } catch { /* ignore */ }
  return { is_admin: false, pages: [] };
}

interface Position {
  id: number;
  staff_name: string;
  category: string;
  basket_group: string;
  catalog_name: string;
  price: number;
}

interface ReportPosition {
  position_id: number;
  staff_name: string;
  catalog_name: string;
  category: string;
  basket_group: string;
  price: number;
  qty: number;
}

interface DayReport {
  id?: number;
  report_date: string;
  positions: ReportPosition[];
  total_rub: number;
  hours: number;
  locked: boolean;
}

interface Plan {
  daily_plan_rub: number;
  daily_plan_hours: number;
  daily_plan_qty: number;
}

interface VacationEntry {
  id: number;
  month: string;
  amount: number;
  comment: string;
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtRub(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function fmtMonth(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return `${months[parseInt(m)]} ${y}`;
}

function getPlanMonth(reports: DayReport[]): number {
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  return reports
    .filter(r => r.report_date.startsWith(thisMonth))
    .reduce((s, r) => s + r.total_rub, 0);
}

const OLIVE = '#6b7c3a';

const AdminStaffCabinet = ({ auth }: { auth: AuthData }) => {
  const staffId = auth.staff_id!;
  const [tab, setTab] = useState<'day' | 'stats' | 'vacation'>('day');
  const [statsPeriod, setStatsPeriod] = useState<'days' | 'months'>('days');

  const [positions, setPositions]   = useState<Position[]>([]);
  const [plan, setPlan]             = useState<Plan | null>(null);
  const [reports, setReports]       = useState<DayReport[]>([]);
  const [vacation, setVacation]     = useState<{ total: number; entries: VacationEntry[] }>({ total: 0, entries: [] });
  const [loading, setLoading]       = useState(true);

  // Дневной отчёт
  const [selectedDate, setSelectedDate] = useState(isoToday());
  const [dayReport, setDayReport]       = useState<DayReport | null>(null);
  const [editPositions, setEditPositions] = useState<ReportPosition[]>([]);
  const [editHours, setEditHours]         = useState(8);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10);
      const to   = isoToday();

      const [posRes, planRes, reportsRes, vacRes] = await Promise.all([
        fetch(`${urls['handbook']}?type=positions`),
        fetch(`${urls['handbook']}?type=plans&staff_id=${staffId}`),
        fetch(`${urls['reports']}?type=reports&staff_id=${staffId}&from=${from}&to=${to}`),
        fetch(`${urls['reports']}?type=vacation&staff_id=${staffId}`),
      ]);
      const [posData, planData, reportsData, vacData] = await Promise.all([
        posRes.json(), planRes.json(), reportsRes.json(), vacRes.json(),
      ]);
      setPositions(posData.positions || []);
      setPlan((planData.plans || [])[0] || null);
      setReports(reportsData.reports || []);
      setVacation({ total: vacData.total || 0, entries: vacData.entries || [] });
    } catch { /* fallback */ }
    setLoading(false);
  }, [staffId]);

  const loadDay = useCallback(async (date: string) => {
    try {
      const res  = await fetch(`${urls['reports']}?type=report&staff_id=${staffId}&date=${date}`);
      const data = await res.json();
      if (data.report) {
        setDayReport(data.report);
        setEditPositions(data.report.positions || []);
        setEditHours(data.report.hours || 8);
      } else {
        setDayReport(null);
        setEditPositions([]);
        setEditHours(8);
      }
    } catch { /* fallback */ }
  }, [staffId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadDay(selectedDate); }, [selectedDate, loadDay]);

  // Группируем позиции по корзине
  const grouped: Record<string, Position[]> = {};
  for (const p of positions) {
    if (!grouped[p.basket_group]) grouped[p.basket_group] = [];
    grouped[p.basket_group].push(p);
  }

  const setQty = (posId: number, qty: number, pos: Position) => {
    setEditPositions(prev => {
      const exists = prev.find(p => p.position_id === posId);
      if (qty <= 0) return prev.filter(p => p.position_id !== posId);
      if (exists) return prev.map(p => p.position_id === posId ? { ...p, qty } : p);
      return [...prev, {
        position_id: posId,
        staff_name: pos.staff_name,
        catalog_name: pos.catalog_name,
        category: pos.category,
        basket_group: pos.basket_group,
        price: pos.price,
        qty,
      }];
    });
  };

  const getQty = (posId: number) => editPositions.find(p => p.position_id === posId)?.qty || 0;
  const totalRub = editPositions.reduce((s, p) => s + p.price * p.qty, 0);

  const isToday = selectedDate === isoToday();
  const canEdit = !dayReport?.locked && isToday;

  const saveReport = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await fetch(urls['reports'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'report',
          staff_id: staffId,
          report_date: selectedDate,
          positions: editPositions,
          total_rub: totalRub,
          hours: editHours,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await load();
      await loadDay(selectedDate);
    } catch { /* ignore */ }
    setSaving(false);
  };

  // Статистика по дням/месяцам
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const monthReports = reports.filter(r => r.report_date.startsWith(currentMonth));
  const monthEarned  = monthReports.reduce((s, r) => s + r.total_rub, 0);
  const monthHours   = monthReports.reduce((s, r) => s + r.hours, 0);
  const monthDays    = monthReports.length;
  const planMonthRub = plan ? plan.daily_plan_rub * 22 : 0; // ~22 рабочих дня
  const planPct      = planMonthRub > 0 ? Math.min(100, Math.round(monthEarned / planMonthRub * 100)) : 0;
  const bonus        = planPct >= 100 ? monthEarned * 0.1 : planPct >= 80 ? monthEarned * 0.05 : 0;

  // Статистика по месяцам
  const monthsMap: Record<string, number> = {};
  for (const r of reports) {
    const ym = r.report_date.slice(0, 7);
    monthsMap[ym] = (monthsMap[ym] || 0) + r.total_rub;
  }
  const monthsList = Object.entries(monthsMap).sort((a, b) => b[0].localeCompare(a[0]));

  // Текущая неделя
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekReports = reports.filter(r => new Date(r.report_date + 'T00:00:00') >= weekStart);
  const weekEarned  = weekReports.reduce((s, r) => s + r.total_rub, 0);

  if (loading) return <div className="p-8 text-muted-foreground">Загружаю...</div>;

  return (
    <div className="p-6 max-w-3xl">
      {/* Приветствие */}
      <h1 className="font-display text-2xl font-semibold text-primary mb-1">
        Привет, {auth.full_name?.split(' ')[0]} 👋
      </h1>
      <p className="text-sm text-muted-foreground mb-5">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      {/* Вкладки */}
      <div className="flex gap-2 mb-6">
        {([['day', 'Мой день'], ['stats', 'Статистика ЗП'], ['vacation', 'Отпускные']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
              tab === key ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── МОЙ ДЕНЬ ──────────────────────────────────────────── */}
      {tab === 'day' && (
        <div>
          {/* Выбор даты */}
          <div className="flex items-center gap-3 mb-4">
            <input type="date" value={selectedDate}
              max={isoToday()}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
            {!isToday && (
              <span className="text-xs text-muted-foreground">Прошлые дни только для просмотра</span>
            )}
            {dayReport?.locked && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">Заблокирован для редактирования</span>
            )}
          </div>

          {/* Часы работы */}
          {canEdit && (
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm font-semibold text-primary">Отработано часов:</label>
              <input type="number" min={0} max={24} step={0.5} value={editHours}
                onChange={e => setEditHours(parseFloat(e.target.value) || 0)}
                className="w-20 border border-primary/30 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-accent text-center" />
            </div>
          )}

          {/* Позиции по корзинам */}
          <div className="space-y-3 mb-5">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, poses]) => (
              <div key={group} className="border border-primary/30 rounded-2xl overflow-hidden">
                <div className="bg-primary/5 px-4 py-2 font-bold text-primary text-sm border-b border-primary/20">
                  {group}
                </div>
                <div className="divide-y divide-primary/10">
                  {poses.map(pos => {
                    const qty = getQty(pos.id);
                    return (
                      <div key={pos.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-primary font-medium truncate">{pos.staff_name}</div>
                          <div className="text-xs text-muted-foreground">{pos.price.toLocaleString('ru-RU')} ₽/шт</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canEdit ? (
                            <>
                              <button onClick={() => setQty(pos.id, qty - 1, pos)}
                                className="w-7 h-7 rounded-lg border border-primary/30 text-primary font-bold hover:bg-primary/5 flex items-center justify-center">−</button>
                              <input type="number" min={0} value={qty}
                                onChange={e => setQty(pos.id, parseInt(e.target.value) || 0, pos)}
                                className="w-14 text-center border border-primary/30 rounded-lg px-1 py-1 text-sm outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              <button onClick={() => setQty(pos.id, qty + 1, pos)}
                                className="w-7 h-7 rounded-lg border border-primary/30 text-primary font-bold hover:bg-primary/5 flex items-center justify-center">+</button>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-primary w-10 text-center">{qty}</span>
                          )}
                          {qty > 0 && (
                            <span className="text-xs font-semibold text-right w-20" style={{ color: OLIVE }}>
                              {fmtRub(qty * pos.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Итог и кнопка */}
          <div className="sticky bottom-0 bg-background border-t border-primary/20 py-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Итого за день</div>
              <div className="text-2xl font-bold text-primary">{fmtRub(totalRub)}</div>
              {plan && (
                <div className="text-xs text-muted-foreground">
                  План: {fmtRub(plan.daily_plan_rub)} · {Math.round(totalRub / plan.daily_plan_rub * 100)}%
                </div>
              )}
            </div>
            {canEdit && (
              <button onClick={saveReport} disabled={saving || editPositions.length === 0}
                className="px-6 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 bg-accent hover:bg-accent/90 text-accent-foreground">
                {saving ? 'Отправляю...' : saved ? '✓ Отправлено!' : 'Отправить отчёт'}
              </button>
            )}
          </div>

          {/* % выполнения дня */}
          {dayReport && plan && (
            <div className="mt-4 p-4 bg-card border border-primary/30 rounded-2xl">
              <div className="text-sm font-semibold text-primary mb-2">Выполнение дневного плана</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-primary/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round(dayReport.total_rub / plan.daily_plan_rub * 100))}%`, backgroundColor: '#8a9a5a' }} />
                </div>
                <span className="text-sm font-bold" style={{ color: OLIVE }}>
                  {Math.round(dayReport.total_rub / plan.daily_plan_rub * 100)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {fmtRub(dayReport.total_rub)} из {fmtRub(plan.daily_plan_rub)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── СТАТИСТИКА ЗП ─────────────────────────────────────── */}
      {tab === 'stats' && (
        <div>
          {/* Переключатель периода */}
          <div className="flex gap-2 mb-5">
            <button onClick={() => setStatsPeriod('days')}
              className={`px-3 py-1.5 rounded-xl border text-sm transition-colors ${statsPeriod === 'days' ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'}`}>
              По дням
            </button>
            <button onClick={() => setStatsPeriod('months')}
              className={`px-3 py-1.5 rounded-xl border text-sm transition-colors ${statsPeriod === 'months' ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'}`}>
              По месяцам
            </button>
          </div>

          {/* Карточки-сводки */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-card border border-primary/30 rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">Этот месяц</div>
              <div className="text-xl font-bold text-primary">{fmtRub(monthEarned)}</div>
              <div className="text-xs text-muted-foreground">{monthDays} дней · {monthHours.toFixed(1)} ч</div>
            </div>
            <div className="bg-card border border-primary/30 rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">Эта неделя</div>
              <div className="text-xl font-bold text-primary">{fmtRub(weekEarned)}</div>
              <div className="text-xs text-muted-foreground">{weekReports.length} дней</div>
            </div>
            {plan && (
              <div className="bg-card border border-primary/30 rounded-2xl p-4">
                <div className="text-xs text-muted-foreground mb-1">Выполнение плана</div>
                <div className="text-xl font-bold" style={{ color: OLIVE }}>{planPct}%</div>
                <div className="h-2 rounded-full bg-primary/10 mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${planPct}%`, backgroundColor: '#8a9a5a' }} />
                </div>
              </div>
            )}
            {bonus > 0 && (
              <div className="bg-card border border-accent/40 rounded-2xl p-4">
                <div className="text-xs text-muted-foreground mb-1">Премия</div>
                <div className="text-xl font-bold text-primary">{fmtRub(bonus)}</div>
                <div className="text-xs text-muted-foreground">{planPct >= 100 ? '10% за выполнение' : '5% за 80%+'}</div>
              </div>
            )}
          </div>

          {/* Таблица */}
          {statsPeriod === 'days' ? (
            <div className="border border-primary/30 rounded-2xl overflow-hidden">
              <div className="bg-primary/5 px-4 py-2 grid grid-cols-4 text-xs font-semibold text-primary/70 border-b border-primary/20">
                <span>Дата</span><span className="text-right">Заработано</span>
                <span className="text-right">Часы</span><span className="text-right">% плана</span>
              </div>
              {monthReports.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Нет данных за этот месяц</p>
              ) : monthReports.map(r => (
                <div key={r.id} className="px-4 py-2.5 grid grid-cols-4 border-b border-primary/10 last:border-0 text-sm hover:bg-primary/3">
                  <span className="text-primary/70">{new Date(r.report_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' })}</span>
                  <span className="text-right font-semibold text-primary">{fmtRub(r.total_rub)}</span>
                  <span className="text-right text-primary/70">{r.hours}ч</span>
                  <span className="text-right font-semibold" style={{ color: OLIVE }}>
                    {plan ? Math.round(r.total_rub / plan.daily_plan_rub * 100) : '—'}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-primary/30 rounded-2xl overflow-hidden">
              <div className="bg-primary/5 px-4 py-2 grid grid-cols-3 text-xs font-semibold text-primary/70 border-b border-primary/20">
                <span>Месяц</span><span className="text-right">Заработано</span><span className="text-right">% плана</span>
              </div>
              {monthsList.map(([ym, sum]) => (
                <div key={ym} className="px-4 py-2.5 grid grid-cols-3 border-b border-primary/10 last:border-0 text-sm hover:bg-primary/3">
                  <span className="text-primary">{fmtMonth(ym)}</span>
                  <span className="text-right font-semibold text-primary">{fmtRub(sum)}</span>
                  <span className="text-right font-semibold" style={{ color: OLIVE }}>
                    {plan ? Math.round(sum / (plan.daily_plan_rub * 22) * 100) : '—'}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ОТПУСКНЫЕ ─────────────────────────────────────────── */}
      {tab === 'vacation' && (
        <div>
          <div className="bg-card border border-primary/30 rounded-2xl p-5 mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Накоплено отпускных</div>
              <div className="text-3xl font-bold text-primary">{fmtRub(vacation.total)}</div>
            </div>
            <div className="text-5xl">🏖️</div>
          </div>

          {vacation.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Начислений пока нет</p>
          ) : (
            <div className="border border-primary/30 rounded-2xl overflow-hidden">
              <div className="bg-primary/5 px-4 py-2 grid grid-cols-3 text-xs font-semibold text-primary/70 border-b border-primary/20">
                <span>Месяц</span><span className="text-right">Сумма</span><span>Комментарий</span>
              </div>
              {vacation.entries.map(e => (
                <div key={e.id} className="px-4 py-2.5 grid grid-cols-3 border-b border-primary/10 last:border-0 text-sm">
                  <span className="text-primary">{fmtMonth(e.month)}</span>
                  <span className="text-right font-semibold" style={{ color: OLIVE }}>{fmtRub(e.amount)}</span>
                  <span className="text-primary/60 pl-2 text-xs truncate">{e.comment}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Обёртка для роутинга — читает auth из sessionStorage
export const AdminStaffCabinetPage = () => {
  const auth = getAuthFromSession();
  return <AdminStaffCabinet auth={auth} />;
};

export default AdminStaffCabinet;
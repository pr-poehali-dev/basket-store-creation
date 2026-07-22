import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
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

type Category = 'whole' | 'no_handle' | 'handle' | 'ears';
const CATEGORY_KEYS: Category[] = ['whole', 'no_handle', 'handle', 'ears'];
const CATEGORY_LABEL: Record<Category, string> = {
  whole: 'С ручкой', no_handle: 'Без ручки', handle: 'Ручка', ears: 'Уши',
};

interface Position {
  id: number;
  catalog_name: string;
  staff_name: string;
  weave_type: string;
  sort_order: number;
  price_whole: number;
  price_no_handle: number;
  price_handle: number;
  price_ears: number;
}
const CATEGORY_FIELD: Record<Category, keyof Position> = {
  whole: 'price_whole', no_handle: 'price_no_handle', handle: 'price_handle', ears: 'price_ears',
};

interface ReportPosition {
  position_id: number;
  staff_name: string;
  catalog_name: string;
  weave_type: string;
  category: Category;
  price: number;
  qty: number;
}

interface DayReport {
  id?: number;
  report_date: string;
  positions: ReportPosition[];
  total_rub: number;
  hours: number;
  time_start?: string;
  time_end?: string;
  locked: boolean;
}

interface Plan {
  daily_plan_rub: number;
  daily_plan_hours: number;
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
  return Math.round(n).toLocaleString('ru-RU') + ' ₽';
}

function fmtMonth(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return `${months[parseInt(m)]} ${y}`;
}

function bonusFor(sum: number, planMonthRub: number): number {
  if (planMonthRub <= 0) return 0;
  const pct = sum / planMonthRub * 100;
  if (pct >= 100) return sum * 0.1;
  if (pct >= 80) return sum * 0.05;
  return 0;
}

// Часы между временем начала и окончания (учитывает переход через полночь)
function hoursBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}

const OLIVE = '#6b7c3a';
const rowKey = (positionId: number, cat: Category) => `${positionId}__${cat}`;

const AdminStaffCabinet = ({ auth }: { auth: AuthData }) => {
  const staffId = auth.staff_id!;
  const [tab, setTab] = useState<'day' | 'stats' | 'vacation'>('day');
  const [statsPeriod, setStatsPeriod] = useState<'days' | 'months'>('days');

  const [positions, setPositions]   = useState<Position[]>([]);
  const [plan, setPlan]             = useState<Plan | null>(null);
  const [reports, setReports]       = useState<DayReport[]>([]);
  const [vacation, setVacation]     = useState<{ total: number; entries: VacationEntry[] }>({ total: 0, entries: [] });
  const [loading, setLoading]       = useState(true);

  // ── Внести отчёт (дневная форма) ────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(isoToday());
  const [timeStart, setTimeStart]       = useState('');
  const [timeEnd, setTimeEnd]           = useState('');
  const [dayReport, setDayReport]       = useState<DayReport | null>(null);
  const [editPositions, setEditPositions] = useState<ReportPosition[]>([]);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [submitError, setSubmitError]     = useState('');
  const [summaryOpen, setSummaryOpen]     = useState(true);

  // Раскрытые позиции + выбор вида плетения + черновик количеств
  const [openPositions, setOpenPositions] = useState<Record<number, boolean>>({});
  const [selectedRow, setSelectedRow]     = useState<Record<number, number>>({});
  const [draftQty, setDraftQty]           = useState<Record<string, number>>({});

  // Редактирование прошлого дня из статистики
  const [editingDay, setEditingDay] = useState<DayReport | null>(null);
  const [editingDayPositions, setEditingDayPositions] = useState<ReportPosition[]>([]);
  const [editingDaySaving, setEditingDaySaving] = useState(false);

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
        setTimeStart(data.report.time_start ? String(data.report.time_start).slice(0,5) : '');
        setTimeEnd(data.report.time_end ? String(data.report.time_end).slice(0,5) : '');
      } else {
        setDayReport(null);
        setEditPositions([]);
        setTimeStart('');
        setTimeEnd('');
      }
    } catch { /* fallback */ }
  }, [staffId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadDay(selectedDate); }, [selectedDate, loadDay]);

  // Позиции справочника, отсортированные по sort_order — один плоский список без группировки
  const sortedPositions = [...positions].sort((a, b) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.staff_name.localeCompare(b.staff_name, 'ru'));

  const isToday = selectedDate === isoToday();
  const canEdit = !dayReport?.locked && isToday;
  const totalRub = editPositions.reduce((s, p) => s + p.price * p.qty, 0);
  const hoursWorked = hoursBetween(timeStart, timeEnd);

  const getDraft = (positionId: number, cat: Category) => draftQty[rowKey(positionId, cat)] || 0;
  const setDraft = (positionId: number, cat: Category, qty: number) =>
    setDraftQty(prev => ({ ...prev, [rowKey(positionId, cat)]: Math.max(0, qty) }));

  const addToReport = (row: Position) => {
    const cats = CATEGORY_KEYS.filter(c => (row[CATEGORY_FIELD[c]] as number) > 0);
    let changed = false;
    const next = [...editPositions];
    for (const c of cats) {
      const qty = getDraft(row.id, c);
      if (qty <= 0) continue;
      changed = true;
      const idx = next.findIndex(p => p.position_id === row.id && p.category === c);
      if (idx >= 0) next[idx] = { ...next[idx], qty: next[idx].qty + qty };
      else next.push({
        position_id: row.id, staff_name: row.staff_name,
        catalog_name: row.catalog_name, weave_type: row.weave_type, category: c,
        price: row[CATEGORY_FIELD[c]] as number, qty,
      });
    }
    if (!changed) return;
    setEditPositions(next);
    setDraftQty(prev => {
      const copy = { ...prev };
      for (const c of cats) delete copy[rowKey(row.id, c)];
      return copy;
    });
  };

  const removeSummaryItem = (positionId: number, cat: Category) =>
    setEditPositions(prev => prev.filter(p => !(p.position_id === positionId && p.category === cat)));

  const editSummaryQty = (positionId: number, cat: Category, qty: number) =>
    setEditPositions(prev => qty <= 0
      ? prev.filter(p => !(p.position_id === positionId && p.category === cat))
      : prev.map(p => (p.position_id === positionId && p.category === cat) ? { ...p, qty } : p));

  const saveReport = async () => {
    if (!canEdit) return;
    if (!selectedDate || !timeStart || !timeEnd) {
      setSubmitError('Укажите дату, время начала и время окончания работы');
      return;
    }
    setSubmitError('');
    setSaving(true);
    try {
      await fetch(urls['reports'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'report', staff_id: staffId, report_date: selectedDate,
          positions: editPositions, total_rub: totalRub, hours: hoursWorked,
          time_start: timeStart, time_end: timeEnd,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await load();
      await loadDay(selectedDate);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // ── Статистика по дням/месяцам ───────────────────────────────────────────
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const monthReports = reports.filter(r => r.report_date.startsWith(currentMonth));
  const monthEarned  = monthReports.reduce((s, r) => s + r.total_rub, 0);
  const monthDays    = monthReports.length;
  const planMonthRub = plan ? plan.daily_plan_rub * 22 : 0;
  const planPct      = planMonthRub > 0 ? Math.min(100, Math.round(monthEarned / planMonthRub * 100)) : 0;
  const remainingToPlan = Math.max(0, planMonthRub - monthEarned);
  const bonus        = bonusFor(monthEarned, planMonthRub);

  const monthsMap: Record<string, number> = {};
  for (const r of reports) {
    const ym = r.report_date.slice(0, 7);
    monthsMap[ym] = (monthsMap[ym] || 0) + r.total_rub;
  }
  const monthsList = Object.entries(monthsMap).sort((a, b) => b[0].localeCompare(a[0]));

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekReports = reports.filter(r => new Date(r.report_date + 'T00:00:00') >= weekStart);
  const weekEarned  = weekReports.reduce((s, r) => s + r.total_rub, 0);

  // ── Редактирование прошлого дня (из статистики) ─────────────────────────
  const openDayEdit = (r: DayReport) => {
    if (r.locked) return;
    setEditingDay(r);
    setEditingDayPositions(r.positions || []);
  };
  const editingDayTotal = editingDayPositions.reduce((s, p) => s + p.price * p.qty, 0);
  const saveEditingDay = async () => {
    if (!editingDay) return;
    setEditingDaySaving(true);
    try {
      await fetch(urls['reports'], {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'report', staff_id: staffId, report_date: editingDay.report_date,
          positions: editingDayPositions, total_rub: editingDayTotal, hours: editingDay.hours || 0,
          time_start: editingDay.time_start || null, time_end: editingDay.time_end || null,
        }),
      });
      setEditingDay(null);
      await load();
      if (editingDay.report_date === selectedDate) await loadDay(selectedDate);
    } catch { /* ignore */ }
    setEditingDaySaving(false);
  };

  if (loading) return <div className="p-8 text-muted-foreground">Загружаю...</div>;

  return (
    <div className="p-6 max-w-3xl relative">
      {/* Приветствие */}
      <h1 className="font-display text-2xl font-semibold text-primary mb-1">
        Привет, {auth.full_name?.split(' ')[0]} 👋
      </h1>
      <p className="text-sm text-muted-foreground mb-5">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      {/* Вкладки */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button onClick={() => setTab('day')}
          className={`px-5 py-2.5 rounded-xl text-base font-bold transition-colors ${
            tab === 'day' ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}>
          Внести отчёт
        </button>
        <button onClick={() => setTab('stats')}
          className={`px-5 py-2.5 rounded-xl text-base font-bold transition-colors ${
            tab === 'stats' ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}>
          Статистика ЗП
        </button>
        <button onClick={() => setTab('vacation')}
          className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
            tab === 'vacation' ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'
          }`}>
          Отпускные
        </button>
      </div>

      {/* ── ВНЕСТИ ОТЧЁТ ──────────────────────────────────────── */}
      {tab === 'day' && (
        <div>
          {/* Дата и время — обязательны */}
          <div className="flex items-end gap-3 mb-4 flex-wrap">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Дата *</label>
              <input type="date" value={selectedDate}
                max={isoToday()}
                onChange={e => setSelectedDate(e.target.value)}
                className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Начало работы *</label>
              <input type="time" value={timeStart} disabled={!canEdit}
                onChange={e => setTimeStart(e.target.value)}
                className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Окончание работы *</label>
              <input type="time" value={timeEnd} disabled={!canEdit}
                onChange={e => setTimeEnd(e.target.value)}
                className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60" />
            </div>
            {hoursWorked > 0 && (
              <span className="text-xs text-muted-foreground pb-2.5">{hoursWorked} ч</span>
            )}
            {!isToday && (
              <span className="text-xs text-muted-foreground pb-2.5">Прошлые дни только для просмотра</span>
            )}
            {dayReport?.locked && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg mb-0.5">Заблокирован для редактирования</span>
            )}
          </div>
          {submitError && <p className="text-xs text-red-500 mb-4">{submitError}</p>}

          {/* Итого — сворачиваемый блок */}
          <div className="border border-primary/30 rounded-2xl mb-5 overflow-hidden">
            <button onClick={() => setSummaryOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-primary/5 hover:bg-primary/8 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-primary">Итого за день</span>
                <span className="text-lg font-bold text-primary">{fmtRub(totalRub)}</span>
                {plan && plan.daily_plan_rub > 0 && (
                  <span className="text-xs text-muted-foreground">План: {fmtRub(plan.daily_plan_rub)} · {Math.round(totalRub / plan.daily_plan_rub * 100)}%</span>
                )}
              </div>
              <Icon name={summaryOpen ? 'ChevronUp' : 'ChevronDown'} size={18} className="text-primary/60" />
            </button>

            {summaryOpen && (
              <div className="divide-y divide-primary/10">
                {editPositions.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">Пока ничего не добавлено</p>
                ) : editPositions.map(item => (
                  <div key={rowKey(item.position_id, item.category)} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-primary truncate">{item.staff_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {CATEGORY_LABEL[item.category]}{item.weave_type ? ` · ${item.weave_type}` : ''} · {item.price.toLocaleString('ru-RU')} ₽/шт
                      </div>
                    </div>
                    {canEdit ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input type="number" min={0} value={item.qty}
                          onChange={e => editSummaryQty(item.position_id, item.category, parseInt(e.target.value, 10) || 0)}
                          className="w-14 text-center border border-primary/30 rounded-lg px-1 py-1 text-sm outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <span className="text-sm font-semibold w-20 text-right" style={{ color: OLIVE }}>{fmtRub(item.qty * item.price)}</span>
                        <button onClick={() => removeSummaryItem(item.position_id, item.category)} className="text-red-400 hover:text-red-600">
                          <Icon name="Trash2" size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-primary w-10 text-center">{item.qty}</span>
                        <span className="text-sm font-semibold w-20 text-right" style={{ color: OLIVE }}>{fmtRub(item.qty * item.price)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canEdit && (
              <div className="px-4 py-3 border-t border-primary/10 flex justify-end">
                <button onClick={saveReport} disabled={saving || editPositions.length === 0}
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 bg-accent hover:bg-accent/90 text-accent-foreground">
                  {saving ? 'Отправляю...' : saved ? '✓ Отправлено!' : 'Отправить отчёт'}
                </button>
              </div>
            )}
          </div>

          {/* Позиции — плоский список, сортировка по sort_order из справочника */}
          <div className="space-y-2 mb-5">
            {sortedPositions.map(row => {
              const isPosOpen = !!openPositions[row.id];
              const selectedId = selectedRow[row.id] ?? row.id;
              const activeRow = sortedPositions.find(r => r.id === selectedId) || row;
              const cats = CATEGORY_KEYS.filter(c => (activeRow[CATEGORY_FIELD[c]] as number) > 0);
              // Другие варианты плетения для этой же позиции (совпадающие по catalog_name)
              const weaveVariants = sortedPositions.filter(r => r.catalog_name && r.catalog_name === row.catalog_name && r.weave_type);
              const showWeaveButtons = weaveVariants.length > 1;

              return (
                <div key={row.id} className="border border-primary/30 rounded-2xl overflow-hidden">
                  <button onClick={() => setOpenPositions(p => ({ ...p, [row.id]: !p[row.id] }))}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-primary/5 hover:bg-primary/8 transition-colors">
                    <span className="font-semibold text-primary text-sm">{row.staff_name}</span>
                    <Icon name={isPosOpen ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-primary/50" />
                  </button>

                  {isPosOpen && (
                    <div className="px-4 py-3">
                      {showWeaveButtons && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {weaveVariants.map(r => (
                            <button key={r.id}
                              onClick={() => setSelectedRow(p => ({ ...p, [row.id]: r.id }))}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                                selectedId === r.id ? 'bg-primary text-white border-primary' : 'border-primary/30 text-primary hover:border-primary'
                              }`}>
                              {r.weave_type}
                            </button>
                          ))}
                        </div>
                      )}

                      {cats.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Нет цен для этой позиции</p>
                      ) : (
                        <div className="space-y-2">
                          {cats.map(cat => {
                            const price = activeRow[CATEGORY_FIELD[cat]] as number;
                            const qty   = getDraft(activeRow.id, cat);
                            return (
                              <div key={cat} className="flex items-center gap-3">
                                <span className="text-sm text-primary flex-1">{CATEGORY_LABEL[cat]}</span>
                                <input type="number" min={0} placeholder="0" value={qty || ''}
                                  onChange={e => setDraft(activeRow.id, cat, parseInt(e.target.value, 10) || 0)}
                                  className="w-16 text-center border border-primary/30 rounded-lg px-1 py-1.5 text-sm outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                <span className="text-xs text-muted-foreground w-20 text-right">{price.toLocaleString('ru-RU')} ₽</span>
                                <span className="text-sm font-semibold w-20 text-right" style={{ color: OLIVE }}>{qty > 0 ? fmtRub(qty * price) : '—'}</span>
                              </div>
                            );
                          })}
                          <div className="flex justify-end pt-1">
                            <button onClick={() => addToReport(activeRow)}
                              className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold transition-colors">
                              + Добавить в отчёт
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {sortedPositions.length === 0 && (
              <p className="text-sm text-muted-foreground">Позиции ещё не добавлены в справочник</p>
            )}
          </div>

          {/* % выполнения дня */}
          {dayReport && plan && plan.daily_plan_rub > 0 && (
            <div className="p-4 bg-card border border-primary/30 rounded-2xl">
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

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-card border border-primary/30 rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">Этот месяц</div>
              <div className="text-xl font-bold text-primary">{fmtRub(monthEarned)}</div>
              <div className="text-xs text-muted-foreground">{monthDays} дней</div>
            </div>
            <div className="bg-card border border-primary/30 rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">Эта неделя</div>
              <div className="text-xl font-bold text-primary">{fmtRub(weekEarned)}</div>
              <div className="text-xs text-muted-foreground">{weekReports.length} дней</div>
            </div>
            {plan && plan.daily_plan_rub > 0 && (
              <div className="bg-card border border-primary/30 rounded-2xl p-4">
                <div className="text-xs text-muted-foreground mb-1">Выполнение плана</div>
                <div className="text-xl font-bold" style={{ color: OLIVE }}>{planPct}%</div>
                <div className="h-2 rounded-full bg-primary/10 mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${planPct}%`, backgroundColor: '#8a9a5a' }} />
                </div>
              </div>
            )}
            {plan && plan.daily_plan_rub > 0 && (
              <div className="bg-card border border-primary/30 rounded-2xl p-4">
                <div className="text-xs text-muted-foreground mb-1">Осталось до плана</div>
                <div className="text-xl font-bold text-primary">{fmtRub(remainingToPlan)}</div>
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

          {statsPeriod === 'days' ? (
            <div className="border border-primary/30 rounded-2xl overflow-hidden">
              <div className="bg-primary/5 px-4 py-2 grid grid-cols-3 text-xs font-semibold text-primary/70 border-b border-primary/20">
                <span>Дата</span><span className="text-right">Заработано</span><span className="text-right">% плана</span>
              </div>
              {monthReports.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Нет данных за этот месяц</p>
              ) : monthReports.map(r => (
                <button key={r.id} onClick={() => openDayEdit(r)}
                  className="w-full px-4 py-2.5 grid grid-cols-3 border-b border-primary/10 last:border-0 text-sm hover:bg-primary/3 transition-colors text-left">
                  <span className="text-primary/70 flex items-center gap-1.5">
                    {new Date(r.report_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' })}
                    {r.locked && <Icon name="Lock" size={11} className="text-muted-foreground" />}
                  </span>
                  <span className="text-right font-semibold text-primary">{fmtRub(r.total_rub)}</span>
                  <span className="text-right font-semibold" style={{ color: OLIVE }}>
                    {plan && plan.daily_plan_rub > 0 ? Math.round(r.total_rub / plan.daily_plan_rub * 100) : '—'}%
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="border border-primary/30 rounded-2xl overflow-hidden">
              <div className="bg-primary/5 px-4 py-2 grid grid-cols-4 text-xs font-semibold text-primary/70 border-b border-primary/20">
                <span>Месяц</span><span className="text-right">Заработано</span><span className="text-right">% плана</span><span className="text-right">Премия</span>
              </div>
              {monthsList.map(([ym, sum]) => {
                const monthBonus = bonusFor(sum, planMonthRub);
                return (
                  <div key={ym} className="px-4 py-2.5 grid grid-cols-4 border-b border-primary/10 last:border-0 text-sm hover:bg-primary/3">
                    <span className="text-primary">{fmtMonth(ym)}</span>
                    <span className="text-right font-semibold text-primary">{fmtRub(sum)}</span>
                    <span className="text-right font-semibold" style={{ color: OLIVE }}>
                      {planMonthRub > 0 ? Math.round(sum / planMonthRub * 100) : '—'}%
                    </span>
                    <span className="text-right font-semibold text-primary">{monthBonus > 0 ? fmtRub(monthBonus) : '—'}</span>
                  </div>
                );
              })}
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

      {/* Кнопка "наверх" */}
      <button onClick={scrollTop}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-40">
        <Icon name="ArrowUp" size={18} />
      </button>

      {/* Модалка редактирования прошлого дня (из статистики) */}
      {editingDay && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditingDay(null)}>
          <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-primary text-lg">
                {new Date(editingDay.report_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </h3>
              <button onClick={() => setEditingDay(null)} className="text-muted-foreground hover:text-primary text-xl">✕</button>
            </div>

            {editingDayPositions.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-4">Позиций нет</p>
            ) : (
              <div className="space-y-2 mb-4">
                {editingDayPositions.map((item, i) => (
                  <div key={rowKey(item.position_id, item.category) + i} className="flex items-center justify-between gap-2 border-b border-primary/10 pb-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-primary truncate">{item.staff_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {CATEGORY_LABEL[item.category]}{item.weave_type ? ` · ${item.weave_type}` : ''} · {item.price.toLocaleString('ru-RU')} ₽/шт
                      </div>
                    </div>
                    <input type="number" min={0} value={item.qty}
                      onChange={e => {
                        const qty = parseInt(e.target.value, 10) || 0;
                        setEditingDayPositions(prev => qty <= 0
                          ? prev.filter((_, idx) => idx !== i)
                          : prev.map((p, idx) => idx === i ? { ...p, qty } : p));
                      }}
                      className="w-14 text-center border border-primary/30 rounded-lg px-1 py-1 text-sm outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <span className="text-sm font-semibold w-20 text-right" style={{ color: OLIVE }}>{fmtRub(item.qty * item.price)}</span>
                    <button onClick={() => setEditingDayPositions(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Итого</span>
              <span className="text-lg font-bold text-primary">{fmtRub(editingDayTotal)}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={saveEditingDay} disabled={editingDaySaving}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                {editingDaySaving ? 'Сохраняю...' : 'Сохранить'}
              </button>
              <button onClick={() => setEditingDay(null)} className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
            </div>
          </div>
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

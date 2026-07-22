import { useState, useEffect, useCallback } from 'react';
import urls from '../../../backend/func2url.json';
import {
  AuthData, getAuthFromSession, Category, Position, MergedPosition, DayReport, Plan, ReportPosition, VacationEntry,
  isoToday, bonusFor, hoursBetween, rowKey,
  mergePositions, categoryPrice, categoryCatalog, CATEGORY_KEYS,
} from './staffCabinetUtils';
import StaffCabinetDayTab from './StaffCabinetDayTab';
import StaffCabinetStatsTab from './StaffCabinetStatsTab';
import StaffCabinetVacationTab from './StaffCabinetVacationTab';
import StaffCabinetEditDayModal from './StaffCabinetEditDayModal';
import Icon from '@/components/ui/icon';

export type { AuthData };

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

  // Позиции справочника, схлопнутые по «Название для ЗП» (дубли ручка/уши — одна карточка),
  // отсортированные по sort_order
  const sortedPositions = mergePositions(positions).sort((a, b) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.staff_name.localeCompare(b.staff_name, 'ru'));

  const isToday = selectedDate === isoToday();
  const canEdit = !dayReport?.locked && isToday;
  const totalRub = editPositions.reduce((s, p) => s + p.price * p.qty, 0);
  const hoursWorked = hoursBetween(timeStart, timeEnd);

  const getDraft = (positionId: number, cat: Category) => draftQty[rowKey(positionId, cat)] || 0;
  const setDraft = (positionId: number, cat: Category, qty: number) =>
    setDraftQty(prev => ({ ...prev, [rowKey(positionId, cat)]: Math.max(0, qty) }));

  const addToReport = (row: MergedPosition) => {
    const cats = CATEGORY_KEYS.filter(c => categoryPrice(row, c) > 0);
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
        catalog_name: categoryCatalog(row, c), weave_type: row.weave_type, category: c,
        price: categoryPrice(row, c), qty,
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
        <StaffCabinetDayTab
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          timeStart={timeStart}
          setTimeStart={setTimeStart}
          timeEnd={timeEnd}
          setTimeEnd={setTimeEnd}
          hoursWorked={hoursWorked}
          isToday={isToday}
          canEdit={canEdit}
          dayReport={dayReport}
          submitError={submitError}
          summaryOpen={summaryOpen}
          setSummaryOpen={setSummaryOpen}
          totalRub={totalRub}
          plan={plan}
          editPositions={editPositions}
          editSummaryQty={editSummaryQty}
          removeSummaryItem={removeSummaryItem}
          saving={saving}
          saved={saved}
          saveReport={saveReport}
          sortedPositions={sortedPositions}
          openPositions={openPositions}
          setOpenPositions={setOpenPositions}
          selectedRow={selectedRow}
          setSelectedRow={setSelectedRow}
          getDraft={getDraft}
          setDraft={setDraft}
          addToReport={addToReport}
        />
      )}

      {/* ── СТАТИСТИКА ЗП ─────────────────────────────────────── */}
      {tab === 'stats' && (
        <StaffCabinetStatsTab
          statsPeriod={statsPeriod}
          setStatsPeriod={setStatsPeriod}
          monthEarned={monthEarned}
          monthDays={monthDays}
          weekEarned={weekEarned}
          weekReports={weekReports}
          plan={plan}
          planPct={planPct}
          remainingToPlan={remainingToPlan}
          bonus={bonus}
          monthReports={monthReports}
          monthsList={monthsList}
          planMonthRub={planMonthRub}
          openDayEdit={openDayEdit}
        />
      )}

      {/* ── ОТПУСКНЫЕ ─────────────────────────────────────────── */}
      {tab === 'vacation' && (
        <StaffCabinetVacationTab vacation={vacation} />
      )}

      {/* Кнопка "наверх" */}
      <button onClick={scrollTop}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-40">
        <Icon name="ArrowUp" size={18} />
      </button>

      {/* Модалка редактирования прошлого дня (из статистики) */}
      {editingDay && (
        <StaffCabinetEditDayModal
          editingDay={editingDay}
          setEditingDay={setEditingDay}
          editingDayPositions={editingDayPositions}
          setEditingDayPositions={setEditingDayPositions}
          editingDayTotal={editingDayTotal}
          editingDaySaving={editingDaySaving}
          saveEditingDay={saveEditingDay}
        />
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
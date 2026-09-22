import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';

interface Row {
  staff_id: number;
  full_name: string;
  no_plan: boolean;
  trend: number;
  plan_now: number;
  fact_rub: number;
  lag_rub: number;
  plan_hours: number;
  plan_hours_day: number;
  fact_hours: number;
  lag_hours: number;
  fact_days: number;
  lag_days: number;
  speed: number;
  pct_today: number;
  pct_month: number;
  motivation: number;
  bonus: number;
  days: { date: string; rub: number; hours: number }[];
}

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

const rub = (n: number) => (n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';
const num = (n: number) => (n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 });

function MultiSelect<T extends string | number>({ label, options, selected, onToggle, width = 'w-52' }: {
  label: string; options: { value: T; label: string }[]; selected: T[];
  onToggle: (v: T) => void; width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const text = selected.length === 0 ? 'Все'
    : selected.length <= 2 ? options.filter(o => selected.includes(o.value)).map(o => o.label).join(', ')
    : `Выбрано: ${selected.length}`;
  return (
    <div className={`relative ${width}`} ref={ref}>
      <label className="text-[11px] text-primary/50 block mb-1">{label}</label>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 border border-primary/30 rounded-xl px-3 py-2 text-sm bg-background hover:border-primary transition-colors">
        <span className="truncate text-primary">{text}</span>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-primary/40 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-background border border-primary/30 rounded-xl shadow-lg py-1">
          {options.map(o => (
            <button key={String(o.value)} onClick={() => onToggle(o.value)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-primary/5 transition-colors">
              <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                selected.includes(o.value) ? 'bg-accent border-accent' : 'border-primary/30'}`}>
                {selected.includes(o.value) && <Icon name="Check" size={11} className="text-accent-foreground" />}
              </span>
              <span className="text-primary truncate">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const AdminStaffReport = () => {
  const now = new Date();
  const [year, setYears]   = useState<number[]>([now.getFullYear()]);
  const [months, setMonths] = useState<number[]>([now.getMonth() + 1]);
  const [staffFilter, setStaffFilter] = useState<number[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openStaff, setOpenStaff] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const combos: { y: number; m: number }[] = [];
      for (const y of year) for (const m of months) combos.push({ y, m });
      const all = await Promise.all(combos.map(c =>
        fetch(`${urls['reports']}?type=summary&year=${c.y}&month=${c.m}`).then(r => r.json())));
      // Несколько месяцев — суммируем показатели по сотруднику
      const map = new Map<number, Row>();
      for (const res of all) for (const r of (res.rows || []) as Row[]) {
        const ex = map.get(r.staff_id);
        if (!ex) { map.set(r.staff_id, { ...r }); continue; }
        ex.plan_now += r.plan_now; ex.fact_rub += r.fact_rub; ex.lag_rub += r.lag_rub;
        ex.plan_hours += r.plan_hours; ex.fact_hours += r.fact_hours; ex.lag_hours += r.lag_hours;
        ex.fact_days += r.fact_days; ex.lag_days += r.lag_days;
        ex.motivation += r.motivation; ex.bonus += r.bonus;
        ex.days = [...(ex.days || []), ...(r.days || [])];
        ex.speed = ex.fact_hours > 0 ? Math.round(ex.fact_rub / ex.fact_hours) : 0;
        ex.pct_today = ex.plan_now > 0 ? Math.round(ex.fact_rub / ex.plan_now * 100) : 0;
      }
      setRows(Array.from(map.values()).sort((a, b) =>
        Number(!a.no_plan) - Number(!b.no_plan) || a.full_name.localeCompare(b.full_name, 'ru')));
    } catch { /* ignore */ }
    setLoading(false);
  }, [year, months]);

  useEffect(() => { load(); }, [load]);

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const visible = staffFilter.length ? rows.filter(r => staffFilter.includes(r.staff_id)) : rows;
  const staffOpts = rows.map(r => ({ value: r.staff_id, label: r.full_name }));
  const yearOpts = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
    .map(y => ({ value: y, label: String(y) }));

  const calc = visible.filter(r => !r.no_plan);
  const sum = (f: (x: Row) => number) => visible.reduce((a, b) => a + f(b), 0);
  const sumC = (f: (x: Row) => number) => calc.reduce((a, b) => a + f(b), 0);
  const tPlan = sumC(x => x.plan_now);
  const tFact = sum(x => x.fact_rub);
  const tPctToday = tPlan > 0 ? Math.round(tFact / tPlan * 100) : 0;
  const tPctMonth = calc.length ? Math.round(calc.reduce((a, b) => a + b.pct_month, 0) / calc.length) : 0;

  // Красный — отставание, зелёный — перевыполнение
  const neg = (v: number) => (v < 0 ? 'text-red-600 font-semibold' : 'text-primary');
  const pctCell = (v: number) => (v >= 100 ? 'bg-[#92d050] text-black font-bold' : 'text-red-600 font-semibold');
  // Жирная граница — разделитель смысловых блоков
  const SEP = 'border-l-2 border-l-primary/40';

  const Th = ({ children, span = 1, sep = false }: { children?: React.ReactNode; span?: number; sep?: boolean }) => (
    <th colSpan={span} className={`px-2 py-2 border-b border-primary/20 bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wide ${sep ? SEP : ''}`}>
      {children}
    </th>
  );
  const Th2 = ({ children, sep = false }: { children?: React.ReactNode; sep?: boolean }) => (
    <th className={`px-2 py-1.5 border-b-2 border-primary/25 bg-primary/5 text-primary/70 text-[10px] font-semibold whitespace-nowrap ${sep ? SEP : ''}`}>
      {children}
    </th>
  );
  const Td = ({ children, cls = '', sep = false }: { children?: React.ReactNode; cls?: string; sep?: boolean }) => (
    <td className={`px-2 py-1.5 text-center text-[11px] whitespace-nowrap ${sep ? SEP : ''} ${cls}`}>{children}</td>
  );

  const fmtD = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  let idx = 0;

  return (
    <div className="p-6">
      <h1 className="font-display text-2xl font-semibold text-primary mb-4">Сводка по сотрудникам</h1>

      <div className="flex gap-3 mb-5 flex-wrap items-start">
        <MultiSelect label="Год" width="w-36" options={yearOpts}
          selected={year} onToggle={v => toggle(year, v, setYears)} />
        <MultiSelect label="Месяцы" options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
          selected={months} onToggle={v => toggle(months, v, setMonths)} />
        <MultiSelect label="Сотрудники" width="w-56" options={staffOpts}
          selected={staffFilter} onToggle={v => toggle(staffFilter, v, setStaffFilter)} />
      </div>

      {loading ? <p className="text-muted-foreground">Загружаю...</p> : (
        <div className="border border-primary/25 rounded-2xl overflow-x-auto bg-card">
          <table className="border-collapse w-full min-w-[1360px]">
            <thead>
              <tr>
                <Th /><Th />
                <Th span={4} sep>ЗП</Th>
                <Th span={2} sep>Часы</Th>
                <Th span={2} sep>Дни</Th>
                <Th sep>V плетения</Th>
                <Th span={2} sep>% итог</Th>
                <Th sep>Мотивация</Th>
                <Th sep>Премия</Th>
              </tr>
              <tr>
                <Th2>№</Th2><Th2>ФИО</Th2>
                <Th2 sep>тренд</Th2><Th2>план</Th2><Th2>факт</Th2><Th2>отставание</Th2>
                <Th2 sep>факт</Th2><Th2>отставание</Th2>
                <Th2 sep>факт</Th2><Th2>отставание</Th2>
                <Th2 sep>₽/час</Th2>
                <Th2 sep>на сегодня</Th2><Th2>на месяц</Th2>
                <Th2 sep>рубли</Th2>
                <Th2 sep>рубли</Th2>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => {
                const isOpen = !!openStaff[r.staff_id];
                if (!r.no_plan) idx += 1;
                return [
                  <tr key={r.staff_id} className={`border-t border-primary/10 ${r.no_plan ? 'bg-primary/5' : 'hover:bg-primary/5'}`}>
                    <Td cls="text-primary/50">{r.no_plan ? '' : idx}</Td>
                    <td onClick={() => setOpenStaff(p => ({ ...p, [r.staff_id]: !p[r.staff_id] }))}
                      className="px-3 py-1.5 text-[11px] font-semibold text-primary whitespace-nowrap cursor-pointer">
                      <span className="flex items-center gap-1">
                        <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} size={12} className="text-primary/40" />
                        {r.full_name}
                      </span>
                    </td>
                    <Td sep>{r.no_plan ? '—' : num(r.trend)}</Td>
                    <Td>{r.no_plan ? '—' : rub(r.plan_now)}</Td>
                    <Td cls="font-semibold">{rub(r.fact_rub)}</Td>
                    <Td cls={r.no_plan ? '' : neg(r.lag_rub)}>{r.no_plan ? '—' : rub(r.lag_rub)}</Td>
                    <Td sep>{num(r.fact_hours)}</Td>
                    <Td cls={r.no_plan ? '' : neg(r.lag_hours)}>{r.no_plan ? '—' : num(r.lag_hours)}</Td>
                    <Td sep>{r.fact_days}</Td>
                    <Td cls={r.no_plan ? '' : neg(r.lag_days)}>{r.no_plan ? '—' : r.lag_days}</Td>
                    <Td sep>{r.no_plan ? '—' : rub(r.speed)}</Td>
                    <Td sep cls={r.no_plan ? '' : pctCell(r.pct_today)}>{r.no_plan ? '—' : `${r.pct_today}%`}</Td>
                    <Td cls={r.no_plan ? '' : pctCell(r.pct_month)}>{r.no_plan ? '—' : `${r.pct_month}%`}</Td>
                    <Td sep>{rub(r.motivation)}</Td>
                    <Td sep cls={r.bonus > 0 ? 'bg-[#92d050] text-black font-bold' : ''}>{rub(r.bonus)}</Td>
                  </tr>,
                  ...(isOpen ? (r.days || []).map(d => {
                    // День: план = дневной тренд, отставание — факт минус план за день
                    const lagRub = d.rub - (r.no_plan ? 0 : r.trend);
                    const lagHrs = d.hours - (r.no_plan ? 0 : r.plan_hours_day);
                    const pct    = r.trend > 0 ? Math.round(d.rub / r.trend * 100) : 0;
                    return (
                      <tr key={`${r.staff_id}-${d.date}`} className="border-t border-primary/5 bg-primary/[0.03] text-primary/80">
                        <Td />
                        <td className="px-3 py-1 pl-8 text-[11px] text-primary/70 whitespace-nowrap">{fmtD(d.date)}</td>
                        <Td sep>{r.no_plan ? '—' : num(r.trend)}</Td>
                        <Td>{r.no_plan ? '—' : rub(r.trend)}</Td>
                        <Td cls="font-medium">{rub(d.rub)}</Td>
                        <Td cls={r.no_plan ? '' : neg(lagRub)}>{r.no_plan ? '—' : rub(lagRub)}</Td>
                        <Td sep>{num(d.hours)}</Td>
                        <Td cls={r.no_plan ? '' : neg(lagHrs)}>{r.no_plan ? '—' : num(lagHrs)}</Td>
                        <Td sep>1</Td>
                        <Td>—</Td>
                        <Td sep>{d.hours > 0 ? rub(Math.round(d.rub / d.hours)) : '—'}</Td>
                        <Td sep cls={r.no_plan ? '' : pctCell(pct)}>{r.no_plan ? '—' : `${pct}%`}</Td>
                        <Td>—</Td>
                        <Td sep />
                        <Td sep />
                      </tr>
                    );
                  }) : []),
                  isOpen && (r.days || []).length === 0 && (
                    <tr key={`${r.staff_id}-empty`} className="bg-primary/[0.03]">
                      <td colSpan={16} className="px-6 py-2 text-[11px] text-muted-foreground">Нет отчётов за период</td>
                    </tr>
                  ),
                ];
              })}
              {visible.length === 0 && (
                <tr><td colSpan={16} className="px-3 py-6 text-center text-muted-foreground text-sm">Нет данных</td></tr>
              )}
              {visible.length > 0 && (
                <tr className="border-t-2 border-primary/30 bg-primary/10 font-bold text-primary">
                  <Td />
                  <td className="px-3 py-2 text-[11px] font-bold">ИТОГ</td>
                  <Td sep>{rub(sumC(x => x.trend))}</Td>
                  <Td>{rub(tPlan)}</Td>
                  <Td>{rub(tFact)}</Td>
                  <Td cls={sumC(x => x.lag_rub) < 0 ? 'text-red-600' : ''}>{rub(sumC(x => x.lag_rub))}</Td>
                  <Td sep>{num(sum(x => x.fact_hours))}</Td>
                  <Td cls={sumC(x => x.lag_hours) < 0 ? 'text-red-600' : ''}>{num(sumC(x => x.lag_hours))}</Td>
                  <Td sep>{sum(x => x.fact_days)}</Td>
                  <Td cls={sumC(x => x.lag_days) < 0 ? 'text-red-600' : ''}>{sumC(x => x.lag_days)}</Td>
                  <Td sep />
                  <Td sep cls={pctCell(tPctToday)}>{tPctToday}%</Td>
                  <Td cls={pctCell(tPctMonth)}>{tPctMonth}%</Td>
                  <Td sep>{rub(sum(x => x.motivation))}</Td>
                  <Td sep>{rub(sum(x => x.bonus))}</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-primary/45 mt-3">
        План считается от дневного плана («тренд») × количество рабочих дней с начала месяца по вчерашний день.
        Мотивация и премия берутся из вкладки «Зарплата».
      </p>
    </div>
  );
};

export default AdminStaffReport;

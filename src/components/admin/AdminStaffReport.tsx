import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';

interface PRow extends Row { year: number; month: number }

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
  plan_month: number;
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
  const [rows, setRows] = useState<PRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openStaff, setOpenStaff] = useState<Record<number, boolean>>({});
  const [view, setView] = useState<'total' | 'byday'>('total');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const combos: { y: number; m: number }[] = [];
      for (const y of year) for (const m of months) combos.push({ y, m });
      const all = await Promise.all(combos.map(c =>
        fetch(`${urls['reports']}?type=summary&year=${c.y}&month=${c.m}`).then(r => r.json())));
      // Каждый период — своя таблица
      const flat: PRow[] = [];
      all.forEach((res, i) => {
        for (const r of (res.rows || []) as Row[]) {
          flat.push({ ...r, year: combos[i].y, month: combos[i].m });
        }
      });
      setRows(flat);
    } catch { /* ignore */ }
    setLoading(false);
  }, [year, months]);

  useEffect(() => { load(); }, [load]);

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const visible = staffFilter.length ? rows.filter(r => staffFilter.includes(r.staff_id)) : rows;
  const staffOpts = Array.from(new Map(rows.map(r => [r.staff_id, r.full_name])).entries())
    .map(([value, label]) => ({ value, label }));
  const periods = Array.from(new Set(rows.map(r => `${r.year}-${r.month}`)))
    .sort((a, b) => {
      const [ay, am] = a.split('-').map(Number); const [by, bm] = b.split('-').map(Number);
      return ay - by || am - bm;
    });
  const yearOpts = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
    .map(y => ({ value: y, label: String(y) }));


  // Красный — отставание, зелёный — перевыполнение
  const neg = (v: number) => (v < 0 ? 'text-red-600 font-semibold' : 'text-primary');
  const pctCell = (v: number) => (v >= 100 ? 'bg-[#92d050] text-black font-bold' : 'text-red-600 font-semibold');
  // Жирная граница — разделитель смысловых блоков
  const SEP = 'border-l-2 border-l-primary/40';

  const Th = ({ children, span = 1, sep = false, cls = '' }: { children?: React.ReactNode; span?: number; sep?: boolean; cls?: string }) => (
    <th colSpan={span} className={`px-2 py-2 border-b border-primary/20 bg-[#efece5] text-primary text-[11px] font-bold uppercase tracking-wide ${sep ? SEP : ''} ${cls}`}>
      {children}
    </th>
  );
  const Th2 = ({ children, sep = false, cls = '' }: { children?: React.ReactNode; sep?: boolean; cls?: string }) => (
    <th className={`px-2 py-1.5 border-b-2 border-primary/25 bg-[#f6f4ef] text-primary/70 text-[10px] font-semibold whitespace-nowrap ${sep ? SEP : ''} ${cls}`}>
      {children}
    </th>
  );
  const Td = ({ children, cls = '', sep = false }: { children?: React.ReactNode; cls?: string; sep?: boolean }) => (
    <td className={`px-2 py-1.5 text-center text-[11px] whitespace-nowrap border-t border-primary/10 ${sep ? SEP : ''} ${cls}`}>{children}</td>
  );

  const fmtD = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };


  // ── Вид «По дням»: колонки — дни месяца, для каждого дня часы / ЗП / % / отклонение
  const renderDaily = (title: string, list: PRow[], y: number, m: number) => {
    const last = new Date(y, m, 0).getDate();
    const days = Array.from({ length: last }, (_, i) => i + 1);
    const key = (d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const calc = list.filter(r => !r.no_plan);

    const dayOf = (r: PRow, d: number) => (r.days || []).find(x => x.date === key(d));
    const isWeekend = (d: number) => [0, 6].includes(new Date(y, m - 1, d).getDay());

    const Hc = ({ children, cls = '' }: { children?: React.ReactNode; cls?: string }) => (
      <th className={`px-0.5 py-1 text-[10px] font-semibold text-primary/70 whitespace-nowrap ${cls}`}>{children}</th>
    );
    const Dc = ({ children, cls = '' }: { children?: React.ReactNode; cls?: string }) => (
      <td className={`px-0.5 py-1 text-center text-[10px] whitespace-nowrap overflow-hidden ${cls}`}>{children}</td>
    );

    return (
      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold text-primary mb-2">{title}</h2>
        <div className="border border-primary/25 rounded-2xl overflow-x-auto bg-card">
          <table className="table-fixed border-separate border-spacing-0 w-max">
            <colgroup>
              <col style={{ width: 38 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 52 }} />
              {days.map(d => [
                <col key={`${d}a`} style={{ width: 52 }} />,
                <col key={`${d}b`} style={{ width: 52 }} />,
                <col key={`${d}c`} style={{ width: 52 }} />,
                <col key={`${d}d`} style={{ width: 52 }} />,
              ])}
            </colgroup>
            <thead>
              <tr>
                <th className="px-1 py-2 bg-[#efece5] text-[10px] text-primary/70 sticky left-0 z-20 border-b border-primary/20">№</th>
                <th className="px-3 py-2 bg-[#efece5] text-[10px] text-primary/70 text-left sticky left-[38px] z-20 border-b border-primary/20">ФИО</th>
                <th className="px-1 py-2 bg-[#efece5] text-[10px] text-primary/70 sticky left-[188px] z-20 border-b border-primary/20 shadow-[2px_0_0_0_rgba(90,62,40,0.4)]">тренд</th>
                {days.map(d => (
                  <th key={d} colSpan={4}
                    className={`px-2 py-2 text-[10px] font-bold border-l-2 border-primary/40 border-b border-primary/20 ${
                      isWeekend(d) ? 'bg-[#e3dfd5] text-primary/60' : 'bg-[#efece5] text-primary'}`}>
                    {String(d).padStart(2, '0')}.{MONTHS[m - 1].slice(0, 3).toLowerCase()}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="bg-[#f6f4ef] sticky left-0 z-20 border-b-2 border-primary/25" />
                <th className="bg-[#f6f4ef] sticky left-[38px] z-20 border-b-2 border-primary/25" />
                <th className="bg-[#f6f4ef] sticky left-[188px] z-20 border-b-2 border-primary/25 shadow-[2px_0_0_0_rgba(90,62,40,0.4)]" />
                {days.map(d => [
                  <Hc key={`${d}h`} cls="bg-[#f6f4ef] border-l-2 border-l-primary/40 border-b-2 border-b-primary/25">ч</Hc>,
                  <Hc key={`${d}r`} cls="bg-[#f6f4ef] border-l border-l-primary/15 border-b-2 border-b-primary/25">₽</Hc>,
                  <Hc key={`${d}p`} cls="bg-[#f6f4ef] border-l border-l-primary/15 border-b-2 border-b-primary/25">%</Hc>,
                  <Hc key={`${d}o`} cls="bg-[#f6f4ef] border-l border-l-primary/15 border-b-2 border-b-primary/25">откл</Hc>,
                ])}
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={r.staff_id}>
                  <Dc cls={`text-primary/50 sticky left-0 z-10 border-t border-primary/10 ${r.no_plan ? 'bg-[#f2f0ea]' : 'bg-[#fdfcfa]'}`}>{r.no_plan ? '' : i + 1 - list.filter(x => x.no_plan).length}</Dc>
                  <td className={`px-3 py-1 text-[10px] font-semibold text-primary truncate sticky left-[38px] z-10 border-t border-primary/10 ${r.no_plan ? 'bg-[#f2f0ea]' : 'bg-[#fdfcfa]'}`}>{r.full_name}</td>
                  <Dc cls={`font-medium sticky left-[188px] z-10 border-t border-primary/10 shadow-[2px_0_0_0_rgba(90,62,40,0.4)] ${r.no_plan ? 'bg-[#f2f0ea]' : 'bg-[#fdfcfa]'}`}>{r.no_plan ? '0' : num(r.trend)}</Dc>
                  {days.map(d => {
                    const rec = dayOf(r, d);
                    const pct = r.trend > 0 && rec ? Math.round(rec.rub / r.trend * 100) : 0;
                    const dev = rec ? +(rec.hours - r.plan_hours_day).toFixed(2) : 0;
                    const wk  = isWeekend(d) ? 'bg-primary/10' : '';
                    return [
                      <Dc key={`${d}h`} cls={`border-l-2 border-primary/40 border-t border-primary/10 ${wk}`}>{rec ? num(rec.hours) : '-'}</Dc>,
                      <Dc key={`${d}r`} cls={`font-medium border-l border-primary/15 border-t border-primary/10 ${wk}`}>{rec ? num(rec.rub) : '-'}</Dc>,
                      <Dc key={`${d}p`} cls={`border-l border-primary/15 border-t border-primary/10 ${rec && !r.no_plan
                        ? (pct >= 100 ? 'bg-[#c6efce] text-black font-semibold' : 'bg-[#ffc7ce] text-black font-semibold')
                        : wk}`}>{r.no_plan ? '0%' : `${pct}%`}</Dc>,
                      <Dc key={`${d}o`} cls={`border-l border-primary/15 border-t border-primary/10 ${wk} ${rec && dev < 0 ? 'text-red-600 font-semibold' : 'text-primary/70'}`}>
                        {rec && !r.no_plan ? (dev > 0 ? `+${dev}` : dev) : '-'}
                      </Dc>,
                    ];
                  })}
                </tr>
              ))}
              {/* Итоги по дню */}
              <tr className="font-bold text-primary">
                <Dc cls="sticky left-0 z-10 bg-[#e6e2d8] border-t-2 border-primary/30" />
                <td className="px-3 py-1.5 text-[10px] font-bold sticky left-[38px] z-10 bg-[#e6e2d8] border-t-2 border-primary/30">план-факт</td>
                <Dc cls="sticky left-[188px] z-10 bg-[#e6e2d8] border-t-2 border-primary/30 shadow-[2px_0_0_0_rgba(90,62,40,0.4)]">{num(calc.reduce((a, b) => a + b.trend, 0))}</Dc>
                {days.map(d => {
                  const recs = list.map(r => dayOf(r, d)).filter(Boolean) as { rub: number; hours: number }[];
                  const planD = calc.reduce((a, b) => a + b.trend, 0);
                  const factD = recs.reduce((a, b) => a + b.rub, 0);
                  const hrsD  = recs.reduce((a, b) => a + b.hours, 0);
                  const pctD  = planD > 0 ? Math.round(factD / planD * 100) : 0;
                  return [
                    <Dc key={`${d}h`} cls="border-l-2 border-primary/40 border-t-2 border-primary/30 bg-[#e6e2d8]">{hrsD ? num(hrsD) : '-'}</Dc>,
                    <Dc key={`${d}r`} cls="border-l border-primary/15 border-t-2 border-primary/30 bg-[#e6e2d8]">{factD ? num(factD) : '-'}</Dc>,
                    <Dc key={`${d}p`} cls={`border-l border-primary/15 border-t-2 border-primary/30 ${pctD >= 100 ? 'bg-[#c6efce] text-black' : 'bg-[#e6e2d8] text-red-600'}`}>{pctD}%</Dc>,
                    <Dc key={`${d}o`} cls={`border-l border-primary/15 border-t-2 border-primary/30 bg-[#e6e2d8] ${factD - planD < 0 ? 'text-red-600' : 'text-primary'}`}>{num(factD - planD)}</Dc>,
                  ];
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTable = (title: string, list: PRow[]) => {
    const calc = list.filter(r => !r.no_plan);
    const sum = (f: (x: PRow) => number) => list.reduce((a, b) => a + f(b), 0);
    const sumC = (f: (x: PRow) => number) => calc.reduce((a, b) => a + f(b), 0);
    const tPlan = sumC(x => x.plan_now);
    const tFact = sum(x => x.fact_rub);
    const tPctToday = tPlan > 0 ? Math.round(tFact / tPlan * 100) : 0;
    const tPctMonth = calc.length ? Math.round(calc.reduce((a, b) => a + b.pct_month, 0) / calc.length) : 0;
    let idx = 0;
    return (
      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold text-primary mb-2">{title}</h2>
        <div className="border border-primary/25 rounded-2xl overflow-x-auto bg-card">
          <table className="border-separate border-spacing-0 w-full min-w-[1360px]">
            <thead>
              <tr>
                <Th cls="sticky left-0 z-20 w-9" /><Th cls="sticky left-9 z-20 w-[160px]" />
                <Th span={4} sep>ЗП</Th>
                <Th span={2} sep>Часы</Th>
                <Th span={2} sep>Дни</Th>
                <Th sep>V плетения</Th>
                <Th span={2} sep>% итог</Th>
                <Th sep>Мотивация</Th>
                <Th sep>Премия</Th>
              </tr>
              <tr>
                <Th2 cls="sticky left-0 z-20 w-9">№</Th2><Th2 cls="sticky left-9 z-20 w-[160px]">ФИО</Th2>
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
              {list.map(r => {
                const isOpen = !!openStaff[r.staff_id];
                if (!r.no_plan) idx += 1;
                return [
                  <tr key={r.staff_id} className={r.no_plan ? '' : 'hover:bg-primary/5'}>
                    <Td cls={`text-primary/50 sticky left-0 z-10 w-9 ${r.no_plan ? 'bg-[#f2f0ea]' : 'bg-[#fdfcfa]'}`}>{r.no_plan ? '' : idx}</Td>
                    <td onClick={() => setOpenStaff(p => ({ ...p, [r.staff_id]: !p[r.staff_id] }))}
                      className={`px-3 py-1.5 text-[11px] font-semibold text-primary whitespace-nowrap cursor-pointer sticky left-9 z-10 w-[160px] border-t border-primary/10 ${r.no_plan ? 'bg-[#f2f0ea]' : 'bg-[#fdfcfa]'}`}>
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
                    // Доля дня в месячном плане
                    const pctM   = r.plan_month > 0 ? Math.round(d.rub / r.plan_month * 100) : 0;
                    return (
                      <tr key={`${r.staff_id}-${d.date}`} className="bg-[#f7f5f1] text-primary/80">
                        <Td cls="sticky left-0 z-10 w-9 bg-[#f7f5f1]" />
                        <td className="px-3 py-1 pl-8 text-[11px] text-primary/70 whitespace-nowrap sticky left-9 z-10 w-[160px] bg-[#f7f5f1] border-t border-primary/10">{fmtD(d.date)}</td>
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
                        <Td cls={r.no_plan ? '' : 'text-primary/70'}>{r.no_plan ? '—' : `${pctM}%`}</Td>
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
              {list.length === 0 && (
                <tr><td colSpan={16} className="px-3 py-6 text-center text-muted-foreground text-sm">Нет данных</td></tr>
              )}
              {list.length > 0 && (
                <tr className="bg-[#e6e2d8] font-bold text-primary [&>td]:border-t-2 [&>td]:border-primary/30">
                  <Td cls="sticky left-0 z-10 w-9 bg-[#e6e2d8]" />
                  <td className="px-3 py-2 text-[11px] font-bold sticky left-9 z-10 w-[160px] bg-[#e6e2d8] border-t-2 border-primary/30">ИТОГ</td>
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
      </div>
    );
  };


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

      <div className="flex gap-2 mb-5">
        {(['total', 'byday'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
              view === v ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'
            }`}>
            {v === 'total' ? 'Общая' : 'По дням'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-muted-foreground">Загружаю...</p> : (
        <>
          {periods.map(pk => {
            const [y, m] = pk.split('-').map(Number);
            const list = visible.filter(r => r.year === y && r.month === m);
            const title = `${MONTHS[m - 1]} ${y}`;
            return <div key={pk}>{view === 'total' ? renderTable(title, list) : renderDaily(title, list, y, m)}</div>;
          })}
        </>
      )}
      <p className="text-[11px] text-primary/45 mt-3">
        План считается от дневного плана («тренд») × количество рабочих дней с начала месяца по вчерашний день.
        Мотивация и премия берутся из вкладки «Зарплата».
      </p>
    </div>
  );
};

export default AdminStaffReport;

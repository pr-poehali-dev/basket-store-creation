import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';

interface DayRow { date: string; total_rub: number; hours: number }
interface SalaryRow {
  staff_id: number;
  full_name: string;
  daily_plan_rub: number;
  earned: number;
  plan_pct: number;
  prev_balance: number;
  defect: number;
  bonus: number;
  motivation: number;
  paid: number;
  days: DayRow[];
}
type EditField = 'prev_balance' | 'defect' | 'bonus' | 'motivation' | 'paid';

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const OLIVE = '#6b7c3a';

function rub(n: number) {
  return (n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';
}
function fmtD(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
}
// Остаток = прошлый остаток − брак + премия + мотивация + ЗП за период − выдано
function finalBalance(r: SalaryRow) {
  return r.prev_balance - r.defect + r.bonus + r.motivation + r.earned - r.paid;
}

const AdminSalary = () => {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [months, setMonths] = useState<number[]>([now.getMonth() + 1]);
  const [halves, setHalves] = useState<number[]>([now.getDate() <= 15 ? 1 : 2]);
  const [staffFilter, setStaffFilter] = useState<number[]>([]);
  const [rows, setRows]   = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openStaff, setOpenStaff] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Собираем данные по всем выбранным месяцам и периодам, суммируя по сотруднику
      const combos: { m: number; h: number }[] = [];
      for (const m of months) for (const h of halves) combos.push({ m, h });
      const all = await Promise.all(combos.map(c =>
        fetch(`${urls['reports']}?type=salary&year=${year}&month=${c.m}&half=${c.h}`).then(r => r.json())
      ));
      const merged = new Map<number, SalaryRow>();
      for (const res of all) {
        for (const r of (res.rows || []) as SalaryRow[]) {
          const ex = merged.get(r.staff_id);
          if (!ex) { merged.set(r.staff_id, { ...r, days: [...r.days] }); continue; }
          ex.earned += r.earned;
          ex.prev_balance += r.prev_balance;
          ex.defect += r.defect; ex.bonus += r.bonus;
          ex.motivation += r.motivation; ex.paid += r.paid;
          ex.days = [...ex.days, ...r.days];
          const planTotal = ex.daily_plan_rub * ex.days.length;
          ex.plan_pct = planTotal > 0 ? Math.round(ex.earned / planTotal * 100) : 0;
        }
      }
      setRows(Array.from(merged.values()).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru')));
    } catch { /* ignore */ }
    setLoading(false);
  }, [year, months, halves]);

  useEffect(() => { load(); }, [load]);

  const saveField = async (r: SalaryRow, field: EditField, value: number) => {
    setRows(prev => prev.map(x => x.staff_id === r.staff_id ? { ...x, [field]: value } : x));
    // Правка применяется к первому выбранному периоду
    await fetch(urls['reports'], {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'salary_adj', staff_id: r.staff_id, year,
        month: months[0], half: halves[0], field, value,
      }),
    });
  };

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const visible = staffFilter.length ? rows.filter(r => staffFilter.includes(r.staff_id)) : rows;

  const chip = (active: boolean) =>
    `px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
      active ? 'bg-primary text-white border-primary' : 'border-primary/30 text-primary hover:border-primary'
    }`;

  const numCell = (r: SalaryRow, field: EditField) => (
    <td className="px-1 py-1.5 border border-primary/10 w-[92px]">
      <input type="number" defaultValue={r[field] || ''} placeholder="0"
        key={`${r.staff_id}-${field}-${r[field]}`}
        onBlur={e => saveField(r, field, parseFloat(e.target.value) || 0)}
        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-full text-center border border-primary/25 rounded px-1 py-1 text-xs outline-none focus:border-accent bg-background [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
    </td>
  );

  return (
    <div className="p-6">
      <h1 className="font-display text-2xl font-semibold text-primary mb-4">Зарплата</h1>

      {/* Фильтры */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-primary/50 w-20">Год</span>
          {[year - 1, year, year + 1].map(y => (
            <button key={y} onClick={() => setYear(y)} className={chip(year === y)}>{y}</button>
          ))}
        </div>
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-xs text-primary/50 w-20 pt-1">Месяцы</span>
          <div className="flex gap-1.5 flex-wrap flex-1">
            {MONTHS.map((m, i) => (
              <button key={m} onClick={() => toggle(months, i + 1, setMonths)}
                className={chip(months.includes(i + 1))}>{m.slice(0, 3)}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-primary/50 w-20">Период</span>
          <button onClick={() => toggle(halves, 1, setHalves)} className={chip(halves.includes(1))}>1–15</button>
          <button onClick={() => toggle(halves, 2, setHalves)} className={chip(halves.includes(2))}>16–31</button>
        </div>
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-xs text-primary/50 w-20 pt-1">Сотрудники</span>
          <div className="flex gap-1.5 flex-wrap flex-1">
            <button onClick={() => setStaffFilter([])} className={chip(staffFilter.length === 0)}>Все</button>
            {rows.map(r => (
              <button key={r.staff_id} onClick={() => toggle(staffFilter, r.staff_id, setStaffFilter)}
                className={chip(staffFilter.includes(r.staff_id))}>{r.full_name}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? <p className="text-muted-foreground">Загружаю...</p> : (
        <div className="border border-primary/25 rounded-2xl overflow-x-auto">
          <table className="text-xs border-collapse w-full min-w-[1180px]">
            <thead>
              <tr className="bg-primary/5 text-primary/70">
                <th className="px-3 py-2 text-left font-semibold sticky left-0 z-10 bg-[#faf8f4] min-w-[170px] shadow-[3px_0_5px_-3px_rgba(0,0,0,0.15)]">Сотрудник</th>
                <th className="px-2 py-2 font-semibold w-[92px]">Дневной план</th>
                <th className="px-2 py-2 font-semibold w-[92px]">ЗП за период</th>
                <th className="px-2 py-2 font-semibold w-[92px]">% плана</th>
                <th className="px-2 py-2 font-semibold w-[92px]">Остаток прошл.</th>
                <th className="px-2 py-2 font-semibold w-[92px]">Брак</th>
                <th className="px-2 py-2 font-semibold w-[92px]">Премия</th>
                <th className="px-2 py-2 font-semibold w-[92px]">Мотивация</th>
                <th className="px-2 py-2 font-semibold w-[92px]">Выдал ЗП</th>
                <th className="px-2 py-2 font-semibold w-[92px]">Остаток</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => {
                const bal = finalBalance(r);
                const isOpen = !!openStaff[r.staff_id];
                return [
                  <tr key={r.staff_id} className="border-t border-primary/10 hover:bg-primary/3">
                    <td onClick={() => setOpenStaff(p => ({ ...p, [r.staff_id]: !p[r.staff_id] }))}
                      className="px-3 py-1.5 font-medium text-primary sticky left-0 z-10 bg-background cursor-pointer shadow-[3px_0_5px_-3px_rgba(0,0,0,0.15)]">
                      <span className="flex items-center gap-1">
                        <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} size={13} className="text-primary/40" />
                        {r.full_name}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center border border-primary/10 w-[92px]">{rub(r.daily_plan_rub)}</td>
                    <td className="px-2 py-1.5 text-center border border-primary/10 font-bold w-[92px]">{rub(r.earned)}</td>
                    <td className="px-2 py-1.5 text-center border border-primary/10 font-semibold w-[92px]" style={{ color: OLIVE }}>{r.plan_pct}%</td>
                    {numCell(r, 'prev_balance')}
                    {numCell(r, 'defect')}
                    {numCell(r, 'bonus')}
                    {numCell(r, 'motivation')}
                    {numCell(r, 'paid')}
                    <td className="px-2 py-1.5 text-center border border-primary/10 font-bold w-[92px]"
                      style={{ color: bal < 0 ? '#dc2626' : OLIVE }}>{rub(bal)}</td>
                  </tr>,
                  isOpen && (
                    <tr key={`${r.staff_id}-days`} className="bg-primary/3">
                      <td colSpan={10} className="px-4 py-2">
                        {r.days.length === 0 ? (
                          <span className="text-muted-foreground">Нет отчётов за период</span>
                        ) : (
                          <table className="text-[11px] border-collapse">
                            <thead>
                              <tr className="text-primary/50">
                                <th className="px-3 py-1 text-left font-semibold">Дата</th>
                                <th className="px-3 py-1 text-right font-semibold">Заработок</th>
                                <th className="px-3 py-1 text-right font-semibold">Часы</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.days.map(d => (
                                <tr key={d.date} className="border-t border-primary/10">
                                  <td className="px-3 py-1 text-primary">{fmtD(d.date)}</td>
                                  <td className="px-3 py-1 text-right font-semibold" style={{ color: OLIVE }}>{rub(d.total_rub)}</td>
                                  <td className="px-3 py-1 text-right text-primary/70">{d.hours || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  ),
                ];
              })}
              {visible.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">Нет данных за выбранный период</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-primary/45 mt-3">
        Остаток = остаток прошлого периода − брак + премия + мотивация + ЗП за период − выдано.
        Перенесите его в «Остаток прошл.» следующего периода.
      </p>
    </div>
  );
};

export default AdminSalary;

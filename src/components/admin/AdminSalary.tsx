import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';
import MultiSelect from './MultiSelect';

interface DayRow { date: string; total_rub: number; hours: number }
interface SalaryRow {
  staff_id: number;
  full_name: string;
  daily_plan_rub: number;
  earned: number;
  plan_pct: number;
  month_pct: number;
  has_cabinet: boolean;
  is_support: boolean;
  earned_manual: number;
  group_name: string;
  prev_balance: number;
  defect: number;
  bonus: number;
  motivation: number;
  paid: number;
  days: DayRow[];
}
// Строка таблицы = сотрудник в конкретном периоде (год/месяц/половина)
interface PeriodRow extends SalaryRow { year: number; month: number; half: number }
type EditField = 'prev_balance' | 'defect' | 'bonus' | 'motivation' | 'paid' | 'earned_manual';

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const OLIVE = '#6b7c3a';

function rub(n: number) {
  return (n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';
}
function fmtD(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
}
function finalBalance(r: SalaryRow) {
  return r.prev_balance - r.defect + r.bonus + r.motivation + r.earned - r.paid;
}

const AdminSalary = () => {
  const now = new Date();
  const [years, setYears]   = useState<number[]>([now.getFullYear()]);
  const [months, setMonths] = useState<number[]>([now.getMonth() + 1]);
  const [halves, setHalves] = useState<number[]>([now.getDate() <= 15 ? 1 : 2]);
  const [staffFilter, setStaffFilter] = useState<number[]>([]);
  const [rows, setRows]     = useState<PeriodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const combos: { y: number; m: number; h: number }[] = [];
      for (const y of years) for (const m of months) for (const h of halves) combos.push({ y, m, h });
      const all = await Promise.all(combos.map(async c => {
        const res  = await fetch(`${urls['reports']}?type=salary&year=${c.y}&month=${c.m}&half=${c.h}`);
        const data = await res.json();
        // Каждый период — отдельные строки, без слияния между периодами
        return ((data.rows || []) as SalaryRow[]).map(r => ({ ...r, year: c.y, month: c.m, half: c.h }));
      }));
      const flat = all.flat().sort((a, b) =>
        a.full_name.localeCompare(b.full_name, 'ru') || a.year - b.year || a.month - b.month || a.half - b.half);
      setRows(flat);
    } catch { /* ignore */ }
    setLoading(false);
  }, [years, months, halves]);

  useEffect(() => { load(); }, [load]);

  const saveField = async (r: PeriodRow, field: EditField, value: number) => {
    setRows(prev => prev.map(x =>
      x.staff_id === r.staff_id && x.year === r.year && x.month === r.month && x.half === r.half
        ? { ...x, [field]: value } : x));
    await fetch(urls['reports'], {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'salary_adj', staff_id: r.staff_id,
        year: r.year, month: r.month, half: r.half, field, value,
      }),
    });
  };

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const visible = staffFilter.length ? rows.filter(r => staffFilter.includes(r.staff_id)) : rows;
  // Уникальные сотрудники — для фильтра
  const staffOpts = Array.from(new Map(rows.map(r => [r.staff_id, r.full_name])).entries())
    .map(([value, label]) => ({ value, label }));

  // Смежные службы — сотрудники из одноимённой группы в правах доступа
  const isSupport = (r: PeriodRow) => r.is_support || !(r.has_cabinet || /фомин/i.test(r.full_name));
  const groupA = visible.filter(r => !isSupport(r));
  const groupB = visible.filter(r => isSupport(r));

  const multiPeriod = years.length * months.length * halves.length > 1;

  const numCell = (r: PeriodRow, field: EditField) => (
    <td className={`px-1 py-1.5 border border-primary/10 w-[92px] ${field === 'paid' || field === 'earned_manual' ? 'bg-[#dceaf5]' : ''}`}>
      <input type="number" defaultValue={r[field] || ''} placeholder="0"
        key={`${r.staff_id}-${r.year}-${r.month}-${r.half}-${field}-${r[field]}`}
        onBlur={e => saveField(r, field, parseFloat(e.target.value) || 0)}
        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-full text-center border border-primary/25 rounded px-1 py-1 text-xs outline-none focus:border-accent bg-background [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
    </td>
  );

  // Одна таблица со строкой «Итого» внизу
  const renderTable = (title: string, list: PeriodRow[], expandable: boolean) => (
    <div className="mb-8">
      <h2 className="font-display text-lg font-semibold text-primary mb-2">{title}</h2>
        <div className="border border-primary/25 rounded-2xl overflow-x-auto">
          <table className="text-xs border-collapse w-full min-w-[1280px]">
            <thead>
              <tr className="bg-primary/5 text-primary/70">
                <th className="px-3 py-2 text-left font-semibold sticky left-0 z-10 bg-[#faf8f4] w-[145px] min-w-[145px] max-w-[145px] shadow-[3px_0_5px_-3px_rgba(0,0,0,0.15)]">Сотрудник</th>
                {multiPeriod && <th className="px-2 py-2 font-semibold w-[92px]">Период</th>}
                <th className="px-2 py-2 font-semibold w-[92px]">Дневной план</th>
                <th className={`px-2 py-2 font-semibold w-[92px] ${expandable ? '' : 'bg-[#dceaf5]'}`}>ЗП за период</th>
                <th className="px-2 py-2 font-semibold w-[92px]">% плана</th>
                <th className="px-2 py-2 font-semibold w-[92px]">% плана мес.</th>
                <th className="px-2 py-2 font-semibold w-[92px]">Остаток прошл.</th>
                <th className="px-2 py-2 font-semibold w-[92px]">Брак</th>
                <th className="px-2 py-2 font-semibold w-[92px]">Премия</th>
                <th className="px-2 py-2 font-semibold w-[92px]">Мотивация</th>
                <th className="px-2 py-2 font-semibold w-[92px] bg-[#dceaf5]">Выдал ЗП</th>
                <th className="px-2 py-2 font-semibold w-[92px]">Остаток</th>
              </tr>
            </thead>
            <tbody>
              {list.map(r => {
                const key    = `${r.staff_id}-${r.year}-${r.month}-${r.half}`;
                const bal    = finalBalance(r);
                const isOpen = !!openKey[key];
                const support = !expandable;
                return [
                  <tr key={key} className="border-t border-primary/10 hover:bg-primary/3">
                    <td onClick={() => expandable && setOpenKey(p => ({ ...p, [key]: !p[key] }))}
                      className={`px-3 py-1.5 font-medium text-primary sticky left-0 z-10 bg-background w-[145px] min-w-[145px] max-w-[145px] shadow-[3px_0_5px_-3px_rgba(0,0,0,0.15)] ${expandable ? 'cursor-pointer' : ''}`}>
                      <span className="flex items-center gap-1">
                        {expandable && <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} size={13} className="text-primary/40" />}
                        {r.full_name}
                      </span>
                    </td>
                    {multiPeriod && (
                      <td className="px-2 py-1.5 text-center border border-primary/10 text-primary/70 w-[92px]">
                        {MONTHS[r.month - 1].slice(0, 3)} {r.half === 1 ? '1–15' : '16–31'}<br />
                        <span className="text-[10px] text-primary/40">{r.year}</span>
                      </td>
                    )}
                    <td className="px-2 py-1.5 text-center border border-primary/10 w-[92px]">{rub(r.daily_plan_rub)}</td>
                    {support
                      ? numCell(r, 'earned_manual')
                      : <td className="px-2 py-1.5 text-center border border-primary/10 font-bold w-[92px]">{rub(r.earned)}</td>}
                    <td className="px-2 py-1.5 text-center border border-primary/10 font-semibold w-[92px]" style={{ color: OLIVE }}>{r.plan_pct}%</td>
                    <td className="px-2 py-1.5 text-center border border-primary/10 font-semibold w-[92px]" style={{ color: OLIVE }}>{r.month_pct ?? 0}%</td>
                    {numCell(r, 'prev_balance')}
                    {numCell(r, 'defect')}
                    {numCell(r, 'bonus')}
                    {numCell(r, 'motivation')}
                    {numCell(r, 'paid')}
                    <td className="px-2 py-1.5 text-center border border-primary/10 font-bold w-[92px]"
                      style={{ color: bal < 0 ? '#dc2626' : OLIVE }}>{rub(bal)}</td>
                  </tr>,
                  expandable && isOpen && (
                    <tr key={`${key}-days`} className="bg-primary/3">
                      <td colSpan={COLS} className="px-0 py-0">
                        <div className="sticky left-0 w-[min(100vw-340px,560px)] px-4 py-2">
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
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
              {list.length === 0 && (
                <tr><td colSpan={COLS} className="px-3 py-6 text-center text-muted-foreground">Нет данных за выбранный период</td></tr>
              )}
              {list.length > 0 && (() => {
                const sum = (f: (x: PeriodRow) => number) => list.reduce((a, b) => a + f(b), 0);
                return (
                  <tr className="border-t-2 border-primary/30 bg-primary/5 font-bold text-primary">
                    <td className="px-3 py-2 sticky left-0 z-10 bg-[#faf8f4] shadow-[3px_0_5px_-3px_rgba(0,0,0,0.15)]">Итого</td>
                    {multiPeriod && <td className="border border-primary/10 w-[92px]" />}
                    <td className="border border-primary/10 w-[92px]" />
                    <td className={`px-2 py-2 text-center border border-primary/10 w-[92px] ${expandable ? '' : 'bg-[#dceaf5]'}`}>{rub(sum(x => x.earned))}</td>
                    <td className="border border-primary/10 w-[92px]" />
                    <td className="border border-primary/10 w-[92px]" />
                    <td className="px-2 py-2 text-center border border-primary/10 w-[92px]">{rub(sum(x => x.prev_balance))}</td>
                    <td className="px-2 py-2 text-center border border-primary/10 w-[92px]">{rub(sum(x => x.defect))}</td>
                    <td className="px-2 py-2 text-center border border-primary/10 w-[92px]">{rub(sum(x => x.bonus))}</td>
                    <td className="px-2 py-2 text-center border border-primary/10 w-[92px]">{rub(sum(x => x.motivation))}</td>
                    <td className="px-2 py-2 text-center border border-primary/10 w-[92px] bg-[#dceaf5]">{rub(sum(x => x.paid))}</td>
                    <td className="px-2 py-2 text-center border border-primary/10 w-[92px]" style={{ color: sum(finalBalance) < 0 ? '#dc2626' : OLIVE }}>{rub(sum(finalBalance))}</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
    </div>
  );

  const COLS = multiPeriod ? 12 : 11;
  const yearOpts = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
    .map(y => ({ value: y, label: String(y) }));

  return (
    <div className="p-6">
      <h1 className="font-display text-2xl font-semibold text-primary mb-4">Зарплата</h1>

      <div className="flex gap-3 mb-5 flex-wrap items-start">
        <MultiSelect label="Год" width="w-36" options={yearOpts}
          selected={years} onToggle={v => toggle(years, v, setYears)} />
        <MultiSelect label="Месяцы" options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
          selected={months} onToggle={v => toggle(months, v, setMonths)} />
        <MultiSelect label="Период" width="w-40"
          options={[{ value: 1, label: '1–15' }, { value: 2, label: '16–31' }]}
          selected={halves} onToggle={v => toggle(halves, v, setHalves)} />
        <MultiSelect label="Сотрудники" width="w-56" options={staffOpts}
          selected={staffFilter} onToggle={v => toggle(staffFilter, v, setStaffFilter)} />
      </div>

      {loading ? <p className="text-muted-foreground">Загружаю...</p> : (
        <>
          {renderTable('Плетение', groupA, true)}
          {renderTable('Смежные службы', groupB, false)}
        </>
      )}
      <p className="text-[11px] text-primary/45 mt-3">
        Остаток = остаток прошлого периода − брак + премия + мотивация + ЗП за период − выдано.
      </p>
    </div>
  );
};

export default AdminSalary;

import { useState, useMemo, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface DayRec { date: string; rub: number; hours: number }
interface PRow {
  staff_id: number; full_name: string; no_plan: boolean;
  trend: number; plan_now: number; plan_month: number; plan_hours_day: number;
  fact_rub: number; lag_rub: number; fact_hours: number; lag_hours: number;
  fact_days: number; lag_days: number; speed: number;
  pct_today: number; pct_month: number; motivation: number; bonus: number;
  days: DayRec[]; year: number; month: number;
}

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

// Палитра в стилистике сайта
const COLORS = ['#6b7c3a','#8a6d3b','#a2563c','#4a6b7c','#7c4a6b','#b08a3e','#5a7c6b','#8c5a3e',
                '#6a5acd','#3e8c6a','#a23c5a','#3c6aa2','#8ca23c','#a2803c','#5a3e8c','#3ea28c'];

type Metric = { key: string; label: string; unit: string; fromDay?: (d: DayRec, r: PRow) => number; fromRow?: (r: PRow) => number };

const METRICS: Metric[] = [
  { key: 'rub',       label: 'Заработок (ЗП)',        unit: '₽', fromDay: d => d.rub,                         fromRow: r => r.fact_rub },
  { key: 'hours',     label: 'Отработанные часы',     unit: 'ч', fromDay: d => d.hours,                       fromRow: r => r.fact_hours },
  { key: 'speed',     label: 'Скорость (₽/час)',      unit: '₽', fromDay: d => (d.hours > 0 ? Math.round(d.rub / d.hours) : 0), fromRow: r => r.speed },
  { key: 'pct',       label: '% выполнения плана',    unit: '%', fromDay: (d, r) => (r.trend > 0 ? Math.round(d.rub / r.trend * 100) : 0), fromRow: r => r.pct_today },
  { key: 'pct_month', label: '% от месячного плана',  unit: '%', fromDay: (d, r) => (r.plan_month > 0 ? Math.round(d.rub / r.plan_month * 100) : 0), fromRow: r => r.pct_month },
  { key: 'lag_rub',   label: 'Отставание по деньгам', unit: '₽', fromDay: (d, r) => Math.round(d.rub - r.trend), fromRow: r => r.lag_rub },
  { key: 'lag_hours', label: 'Отставание по часам',   unit: 'ч', fromDay: (d, r) => +(d.hours - r.plan_hours_day).toFixed(1), fromRow: r => r.lag_hours },
  { key: 'days',      label: 'Отработанные дни',      unit: 'дн', fromRow: r => r.fact_days },
  { key: 'plan',      label: 'План (ЗП)',             unit: '₽', fromRow: r => r.plan_now },
  { key: 'motivation',label: 'Мотивация',             unit: '₽', fromRow: r => r.motivation },
  { key: 'bonus',     label: 'Премия',                unit: '₽', fromRow: r => r.bonus },
];

type Group = 'day' | 'month' | 'year';
type Chart = 'line' | 'bar' | 'area' | 'stacked' | 'pie';
type Mode  = 'staff' | 'dept';


// Выпадающий список: одиночный выбор или множественный с галочками
function Dropdown<T extends string | number>({ label, options, selected, onPick, multi = false, width = 'w-56' }: {
  label: string;
  options: { value: T; label: string; disabled?: boolean }[];
  selected: T[];
  onPick: (v: T) => void;
  multi?: boolean;
  width?: string;
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
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto bg-background border border-primary/30 rounded-xl shadow-lg py-1">
          {multi && (
            <button onClick={() => { onPick('__all__' as T); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-primary/5 transition-colors">
              <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                selected.length === 0 ? 'bg-accent border-accent' : 'border-primary/30'}`}>
                {selected.length === 0 && <Icon name="Check" size={11} className="text-accent-foreground" />}
              </span>
              <span className="text-primary">Все</span>
            </button>
          )}
          {options.map(o => (
            <button key={String(o.value)} disabled={o.disabled}
              onClick={() => { onPick(o.value); if (!multi) setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                o.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-primary/5'}`}>
              <span className={`w-4 h-4 ${multi ? 'rounded' : 'rounded-full'} border flex items-center justify-center flex-shrink-0 ${
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

const StaffReportCharts = ({ rows }: { rows: PRow[] }) => {
  const [metricKey, setMetricKey] = useState('rub');
  const [group, setGroup]   = useState<Group>('day');
  const [chart, setChart]   = useState<Chart>('line');
  const [mode, setMode]     = useState<Mode>('staff');
  const [picked, setPicked] = useState<number[]>([]);

  const metric = METRICS.find(m => m.key === metricKey)!;
  const staffList = useMemo(() =>
    Array.from(new Map(rows.map(r => [r.staff_id, r.full_name])).entries())
      .map(([id, name]) => ({ id, name })), [rows]);

  const active = picked.length ? rows.filter(r => picked.includes(r.staff_id)) : rows;

  // Ключ периода: день / месяц / год
  const periodKey = (r: PRow, iso?: string) => {
    if (group === 'year')  return String(r.year);
    if (group === 'month') return `${MONTHS[r.month - 1].slice(0, 3)} ${r.year}`;
    const d = new Date((iso || '') + 'T00:00:00');
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Сбор данных: по каждому периоду — значение по сотрудникам либо по отделу
  const { data, series } = useMemo(() => {
    const byPeriod = new Map<string, Record<string, number | string>>();
    const names = new Set<string>();
    const counts = new Map<string, Map<string, number>>();

    const put = (pk: string, name: string, val: number, avg: boolean) => {
      if (!byPeriod.has(pk)) byPeriod.set(pk, { period: pk });
      const row = byPeriod.get(pk)!;
      row[name] = ((row[name] as number) || 0) + val;
      if (avg) {
        if (!counts.has(pk)) counts.set(pk, new Map());
        const c = counts.get(pk)!;
        c.set(name, (c.get(name) || 0) + 1);
      }
      names.add(name);
    };

    const isAvg = metric.unit === '%' || metricKey === 'speed';

    for (const r of active) {
      const label = mode === 'dept' ? 'Отдел' : r.full_name;
      if (group === 'day' && metric.fromDay) {
        for (const d of r.days || []) put(periodKey(r, d.date), label, metric.fromDay(d, r), isAvg);
      } else if (metric.fromRow) {
        put(periodKey(r), label, metric.fromRow(r), isAvg);
      }
    }

    // Средние для процентов и скорости
    if (isAvg) {
      for (const [pk, row] of byPeriod) {
        const c = counts.get(pk);
        if (!c) continue;
        for (const [n, cnt] of c) if (cnt > 1) row[n] = Math.round((row[n] as number) / cnt);
      }
    }

    const sorted = Array.from(byPeriod.values()).sort((a, b) => {
      const pa = String(a.period), pb = String(b.period);
      if (group === 'day') {
        const [d1, m1] = pa.split('.').map(Number); const [d2, m2] = pb.split('.').map(Number);
        return m1 - m2 || d1 - d2;
      }
      return pa.localeCompare(pb, 'ru');
    });
    return { data: sorted, series: Array.from(names) };
  }, [active, metric, metricKey, group, mode]);

  // Для круговой — суммарный вклад каждого сотрудника
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of active) {
      if (!metric.fromRow) continue;
      map.set(r.full_name, (map.get(r.full_name) || 0) + metric.fromRow(r));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter(x => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [active, metric]);

  const fmt = (v: number) => `${(v || 0).toLocaleString('ru-RU')} ${metric.unit}`;
  const CHARTS: { v: Chart; l: string }[] = [
    { v: 'line', l: 'Линии' }, { v: 'bar', l: 'Столбцы' },
    { v: 'area', l: 'Область' }, { v: 'stacked', l: 'С накоплением' }, { v: 'pie', l: 'Доли' },
  ];

  const axis = { stroke: '#8a7d6b', fontSize: 11 };
  const tip = {
    contentStyle: { borderRadius: 12, border: '1px solid rgba(90,62,40,0.2)', fontSize: 12 },
    formatter: (v: number) => fmt(v),
  };

  const renderChart = () => {
    if (chart === 'pie') {
      return (
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={130}
            label={(e: { name: string; percent: number }) => `${e.name}: ${Math.round(e.percent * 100)}%`}
            labelLine={false}>
            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip {...tip} />
        </PieChart>
      );
    }
    if (chart === 'bar' || chart === 'stacked') {
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,62,40,0.12)" />
          <XAxis dataKey="period" {...axis} />
          <YAxis {...axis} />
          <Tooltip {...tip} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((n, i) => (
            <Bar key={n} dataKey={n} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]}
              stackId={chart === 'stacked' ? 'a' : undefined} />
          ))}
        </BarChart>
      );
    }
    if (chart === 'area') {
      return (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,62,40,0.12)" />
          <XAxis dataKey="period" {...axis} />
          <YAxis {...axis} />
          <Tooltip {...tip} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((n, i) => (
            <Area key={n} type="monotone" dataKey={n} stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]} fillOpacity={0.25} />
          ))}
        </AreaChart>
      );
    }
    return (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,62,40,0.12)" />
        <XAxis dataKey="period" {...axis} />
        <YAxis {...axis} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((n, i) => (
          <Line key={n} type="monotone" dataKey={n} stroke={COLORS[i % COLORS.length]}
            strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
        ))}
      </LineChart>
    );
  };

  const dayDisabled = !metric.fromDay;

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap items-start">
        <Dropdown label="Показатель" width="w-60"
          options={METRICS.map(m => ({ value: m.key, label: m.label }))}
          selected={[metricKey]}
          onPick={v => { setMetricKey(v); const m = METRICS.find(x => x.key === v); if (m && !m.fromDay && group === 'day') setGroup('month'); }} />
        <Dropdown label="Разрез" width="w-44"
          options={[
            { value: 'day', label: 'По дням', disabled: dayDisabled },
            { value: 'month', label: 'По месяцам' },
            { value: 'year', label: 'По годам' },
          ]}
          selected={[group]} onPick={v => setGroup(v as Group)} />
        <Dropdown label="Тип графика" width="w-48"
          options={CHARTS.map(c => ({ value: c.v, label: c.l }))}
          selected={[chart]} onPick={v => setChart(v as Chart)} />
        <Dropdown label="Срез" width="w-44"
          options={[{ value: 'staff', label: 'По сотрудникам' }, { value: 'dept', label: 'Весь отдел' }]}
          selected={[mode]} onPick={v => setMode(v as Mode)} />
        <Dropdown label="Сотрудники" width="w-56" multi
          options={staffList.map(s => ({ value: s.id, label: s.name }))}
          selected={picked}
          onPick={v => {
            if (v === ('__all__' as unknown as number)) { setPicked([]); return; }
            setPicked(p => p.includes(v as number) ? p.filter(x => x !== v) : [...p, v as number]);
          }} />
      </div>

      <div className="border border-primary/25 rounded-2xl bg-card p-4">
        <h3 className="font-display text-base font-semibold text-primary mb-3">
          {metric.label}
          <span className="text-xs font-normal text-primary/50 ml-2">
            {chart === 'pie' ? 'доли за выбранный период'
              : group === 'day' ? 'по дням' : group === 'month' ? 'по месяцам' : 'по годам'}
          </span>
        </h3>
        {(chart === 'pie' ? pieData.length === 0 : data.length === 0) ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Нет данных для построения графика</p>
        ) : (
          <ResponsiveContainer width="100%" height={420}>
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-[11px] text-primary/45 mt-3">
        Проценты и скорость усредняются по сотрудникам, остальные показатели суммируются.
        Период задаётся фильтрами года и месяцев сверху страницы.
      </p>
    </div>
  );
};

export default StaffReportCharts;

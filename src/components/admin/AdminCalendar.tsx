import { useState, useEffect } from 'react';
import urls from '../../../backend/func2url.json';
import { Order, fmtMoney, weavingPct, paintingPct } from './orderUtils';

// Цвета для линий заказов (циклически)
const LINE_COLORS = [
  '#8A6A4A', '#A07850', '#7A9A6A', '#9B7EC8', '#C4A882',
  '#F4A7B9', '#8A9A6A', '#A8A8A8', '#6B3E26', '#FFCBA4',
];

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  return new Date(s + 'T00:00:00');
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtDay(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtWeekDay(d: Date): string {
  return ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d.getDay()];
}

const AdminCalendar = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch(urls['orders']);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Заказы с датами: дата создания → дата готовности (или +14 дней если нет)
  const calOrders = orders.filter(o => !o.is_trashed);

  // Диапазон календаря: от самой ранней даты до самой поздней + запас
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let rangeStart = new Date(today);
  let rangeEnd = addDays(today, 30);

  for (const o of calOrders) {
    const start = o.created_at ? parseDate(o.created_at.slice(0, 10)) : null;
    const end = o.due_date ? parseDate(o.due_date) : null;
    if (start && start < rangeStart) rangeStart = start;
    if (end && end > rangeEnd) rangeEnd = end;
  }

  // Построим массив дней
  const days: Date[] = [];
  let cur = new Date(rangeStart);
  while (cur <= rangeEnd) {
    days.push(new Date(cur));
    cur = addDays(cur, 1);
  }

  // Для каждого заказа — строка и позиция
  const orderRows = calOrders.map((o, idx) => {
    const start = o.created_at ? parseDate(o.created_at.slice(0, 10)) : new Date(today);
    const end = o.due_date ? parseDate(o.due_date) : addDays(start!, 14);
    return {
      order: o,
      start: start!,
      end: end!,
      color: LINE_COLORS[idx % LINE_COLORS.length],
    };
  });

  // Ширина одного дня (px)
  const DAY_W = 36;
  const LABEL_W = 200;

  const dayIdx = (d: Date) => {
    const diff = Math.round((d.getTime() - rangeStart.getTime()) / 86400000);
    return Math.max(0, diff);
  };

  const todayIdx = dayIdx(today);
  const totalDays = days.length;

  if (loading) return <div className="p-6 text-muted-foreground">Загружаю...</div>;
  if (calOrders.length === 0) return (
    <div className="p-6">
      <h1 className="font-display text-2xl font-semibold text-primary mb-6">Календарь</h1>
      <p className="text-muted-foreground">Нет заказов для отображения.</p>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="font-display text-2xl font-semibold text-primary mb-6">Календарь</h1>

      <div className="overflow-x-auto rounded-2xl border border-primary/30">
        <div style={{ minWidth: LABEL_W + totalDays * DAY_W }}>
          {/* Заголовок с датами */}
          <div className="flex bg-primary/5 border-b border-primary/20 sticky top-0 z-10">
            <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="flex-shrink-0 px-3 py-2 text-xs font-semibold text-primary border-r border-primary/20">
              Заказ
            </div>
            {days.map((d, i) => {
              const isToday = isoDate(d) === isoDate(today);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={i}
                  style={{ width: DAY_W, minWidth: DAY_W }}
                  className={`text-center text-[10px] py-1 border-r border-primary/10 flex-shrink-0 ${
                    isToday ? 'bg-accent/30 font-bold text-primary' : isWeekend ? 'bg-primary/5 text-primary/50' : 'text-primary/70'
                  }`}
                >
                  <div>{fmtDay(d)}</div>
                  <div className="text-[9px]">{fmtWeekDay(d)}</div>
                </div>
              );
            })}
          </div>

          {/* Строки заказов */}
          {orderRows.map(({ order, start, end, color }) => {
            const si = dayIdx(start);
            const ei = dayIdx(end);
            const wPct = weavingPct(order);
            const pPct = paintingPct(order);

            return (
              <div key={order.id} className="flex items-center border-b border-primary/10 hover:bg-primary/5 transition-colors" style={{ height: 52 }}>
                {/* Подпись */}
                <div
                  style={{ width: LABEL_W, minWidth: LABEL_W }}
                  className="flex-shrink-0 px-3 py-1 border-r border-primary/20"
                >
                  <div className="text-[11px] text-primary/70">#{order.order_number}</div>
                  <div className="text-xs font-bold text-primary leading-tight truncate">
                    {order.city} {order.customer_name}
                  </div>
                  <div className="text-[11px] text-primary/70">{fmtMoney(order.total)}</div>
                  <div className="text-[10px] text-primary/50">
                    плет.{wPct}% пок.{pPct}%
                  </div>
                </div>

                {/* Ганнт-ряд */}
                <div className="relative flex-1 h-full">
                  {/* Линия выходных/сегодня */}
                  {days.map((d, i) => {
                    const isToday = isoDate(d) === isoDate(today);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className="absolute top-0 h-full border-r border-primary/10"
                        style={{
                          left: i * DAY_W,
                          width: DAY_W,
                          backgroundColor: isToday ? 'rgba(var(--accent-rgb, 139,109,67),0.08)' : isWeekend ? 'rgba(0,0,0,0.015)' : 'transparent',
                        }}
                      />
                    );
                  })}

                  {/* Линия заказа */}
                  {ei >= 0 && si < totalDays && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 rounded-full flex items-center overflow-hidden"
                      style={{
                        left: Math.max(0, si) * DAY_W + 2,
                        width: Math.max(0, Math.min(ei, totalDays - 1) - Math.max(0, si) + 1) * DAY_W - 4,
                        height: 24,
                        backgroundColor: color + '55',
                        border: `2px solid ${color}88`,
                      }}
                    >
                      <div
                        className="h-full rounded-full opacity-60"
                        style={{
                          width: `${wPct}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  )}

                  {/* Сегодняшняя линия */}
                  <div
                    className="absolute top-0 h-full border-l-2 border-accent/60 z-10"
                    style={{ left: todayIdx * DAY_W }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Легенда */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-2 rounded-full bg-primary/30 border border-primary/50"></div>
          <span>Срок заказа (от создания до готовности)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-2 rounded-full bg-primary/60"></div>
          <span>Прогресс плетения</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-4 bg-accent/60"></div>
          <span>Сегодня</span>
        </div>
      </div>
    </div>
  );
};

export default AdminCalendar;

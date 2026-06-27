import { useState, useEffect } from 'react';
import urls from '../../../backend/func2url.json';
import { Order, fmtMoney, weavingPct, paintingPct, STAGES } from './orderUtils';

const LINE_COLORS = [
  '#8A6A4A','#A07850','#7A8A5A','#9B7EC8','#C4A882',
  '#E4879A','#7A9A6A','#A8A8A8','#6B3E26','#D4B060',
];

// Этапы "в работе": от Плетения до Доставки включительно
const WORK_STAGES = STAGES.slice(STAGES.indexOf('Плетение'), STAGES.indexOf('Доставка') + 1);

function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }
function parseDate(s: string): Date | null { if (!s) return null; return new Date(s + 'T00:00:00'); }
function fmtDay(d: Date): string { return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`; }
function fmtWeekDay(d: Date): string { return ['вс','пн','вт','ср','чт','пт','сб'][d.getDay()]; }
function fmtMonthYear(d: Date): string {
  return d.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
}

// ─── ЛИНЕЙНЫЙ вид (Ганнт) ───────────────────────────────────────────────────
const LinearView = ({ orders }: { orders: Order[] }) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const calOrders = orders.filter(o => !o.is_trashed);

  // Сортируем по due_date (без даты — в конец)
  const sorted = [...calOrders].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  let rangeStart = new Date(today);
  let rangeEnd   = addDays(today, 30);
  for (const o of sorted) {
    const s = o.created_at ? parseDate(o.created_at.slice(0,10)) : null;
    const e = o.due_date   ? parseDate(o.due_date) : null;
    if (s && s < rangeStart) rangeStart = s;
    if (e && e > rangeEnd)   rangeEnd   = e;
  }
  rangeEnd = addDays(rangeEnd, 2);

  const days: Date[] = [];
  let cur = new Date(rangeStart);
  while (cur <= rangeEnd) { days.push(new Date(cur)); cur = addDays(cur,1); }

  const DAY_W   = 36;
  const LABEL_W = 240;
  const ROW_H   = 68;

  const dayIdx = (d: Date) => Math.max(0, Math.round((d.getTime() - rangeStart.getTime()) / 86400000));
  const todayIdx = dayIdx(today);
  const totalDays = days.length;

  const rows = sorted.map((o, idx) => {
    const start = o.created_at ? parseDate(o.created_at.slice(0,10)) : new Date(today);
    const end   = o.due_date   ? parseDate(o.due_date) : addDays(start!, 14);
    return { order: o, start: start!, end: end!, color: LINE_COLORS[idx % LINE_COLORS.length] };
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-primary/30">
      <div style={{ minWidth: LABEL_W + totalDays * DAY_W }}>
        {/* Заголовок */}
        <div className="flex bg-primary/5 border-b border-primary/20 sticky top-0 z-10">
          <div style={{width: LABEL_W, minWidth: LABEL_W}} className="flex-shrink-0 px-3 py-2 text-xs font-semibold text-primary border-r border-primary/20">
            Заказ
          </div>
          {days.map((d, i) => {
            const isToday   = isoDate(d) === isoDate(today);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div key={i} style={{width: DAY_W, minWidth: DAY_W}}
                className={`text-center text-[10px] py-1 border-r border-primary/10 flex-shrink-0 ${
                  isToday ? 'bg-accent/30 font-bold text-primary' : isWeekend ? 'bg-primary/5 text-primary/40' : 'text-primary/60'
                }`}>
                <div>{fmtDay(d)}</div>
                <div className="text-[9px]">{fmtWeekDay(d)}</div>
              </div>
            );
          })}
        </div>

        {/* Строки заказов */}
        {rows.map(({ order, start, end, color }) => {
          const si = dayIdx(start);
          const ei = dayIdx(end);
          const wPct = weavingPct(order);
          const pPct = paintingPct(order);
          const barLeft  = Math.max(0, si) * DAY_W + 2;
          const barWidth = Math.max(0, Math.min(ei, totalDays-1) - Math.max(0, si) + 1) * DAY_W - 4;

          return (
            <div key={order.id} className="flex border-b border-primary/10 hover:bg-primary/5 transition-colors" style={{height: ROW_H}}>
              {/* Подпись */}
              <div style={{width: LABEL_W, minWidth: LABEL_W}} className="flex-shrink-0 px-3 py-2 border-r border-primary/20 flex flex-col justify-center">
                <div className="text-[10px] text-primary/60">#{order.order_number}</div>
                <div className="text-xs font-bold text-primary leading-tight">
                  {order.city} {order.customer_name}
                </div>
                <div className="text-[11px] text-primary/70">{fmtMoney(order.total)}</div>
                <div className="text-[10px]" style={{color:'#7a8a4a'}}>
                  плет.{wPct}% · пок.{pPct}%
                  {order.due_date && <span className="ml-1 text-primary/50">до {fmtDay(parseDate(order.due_date)!)}</span>}
                </div>
              </div>

              {/* Ганнт */}
              <div className="relative flex-1 h-full">
                {days.map((d, i) => {
                  const isToday   = isoDate(d) === isoDate(today);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div key={i} className="absolute top-0 h-full border-r border-primary/10"
                      style={{
                        left: i * DAY_W, width: DAY_W,
                        backgroundColor: isToday ? 'rgba(139,109,67,0.07)' : isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent',
                      }} />
                  );
                })}
                {/* Полоса */}
                {barWidth > 0 && (
                  <div className="absolute top-1/2 -translate-y-1/2 rounded-full overflow-hidden"
                    style={{ left: barLeft, width: barWidth, height: 20, backgroundColor: color+'44', border: `2px solid ${color}88` }}>
                    <div className="h-full rounded-full" style={{ width: `${wPct}%`, backgroundColor: color+'bb' }} />
                  </div>
                )}
                {/* Линия сегодня */}
                <div className="absolute top-0 h-full border-l-2 border-accent/50 z-10"
                  style={{ left: todayIdx * DAY_W }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── МЕСЯЧНЫЙ вид ─────────────────────────────────────────────────────────────
const MonthView = ({ orders }: { orders: Order[] }) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
  });

  const calOrders = orders.filter(o => !o.is_trashed);

  // Дни текущего месяца
  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);

  // Заполняем сетку (пн-вс), добавляем пустые ячейки в начало
  let startWd = firstDay.getDay(); // 0=вс
  startWd = startWd === 0 ? 6 : startWd - 1; // приводим к пн=0

  const gridDays: (Date | null)[] = Array(startWd).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) gridDays.push(new Date(year, month, d));
  while (gridDays.length % 7 !== 0) gridDays.push(null);

  // Для заказа — диапазон дат
  const orderRows = calOrders.map((o, idx) => {
    const start = o.created_at ? parseDate(o.created_at.slice(0,10)) : new Date(today);
    const end   = o.due_date   ? parseDate(o.due_date) : addDays(start!, 14);
    return { order: o, start: start!, end: end!, color: LINE_COLORS[idx % LINE_COLORS.length] };
  });

  const ordersOnDay = (d: Date) =>
    orderRows.filter(r => d >= r.start && d <= r.end);

  const prevMonth = () => { const d = new Date(currentMonth); d.setMonth(d.getMonth()-1); setCurrentMonth(d); };
  const nextMonth = () => { const d = new Date(currentMonth); d.setMonth(d.getMonth()+1); setCurrentMonth(d); };

  const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

  return (
    <div>
      {/* Навигация по месяцам */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={prevMonth} className="px-3 py-1 rounded-lg border border-primary/30 text-primary hover:border-primary text-sm">←</button>
        <h2 className="font-semibold text-primary capitalize">{fmtMonthYear(currentMonth)}</h2>
        <button onClick={nextMonth} className="px-3 py-1 rounded-lg border border-primary/30 text-primary hover:border-primary text-sm">→</button>
      </div>

      <div className="border border-primary/30 rounded-2xl overflow-hidden">
        {/* Заголовок дней недели */}
        <div className="grid grid-cols-7 bg-primary/5 border-b border-primary/20">
          {WEEKDAYS.map(wd => (
            <div key={wd} className="text-center text-xs font-semibold text-primary py-2 border-r border-primary/10 last:border-r-0">
              {wd}
            </div>
          ))}
        </div>

        {/* Сетка дней */}
        <div className="grid grid-cols-7">
          {gridDays.map((d, i) => {
            const isToday   = d ? isoDate(d) === isoDate(today) : false;
            const isWeekend = d ? d.getDay() === 0 || d.getDay() === 6 : false;
            const dayOrders = d ? ordersOnDay(d) : [];

            return (
              <div
                key={i}
                className={`min-h-[100px] border-r border-b border-primary/10 last:border-r-0 p-1.5 ${
                  !d ? 'bg-primary/3' : isToday ? 'bg-accent/10' : isWeekend ? 'bg-primary/3' : 'bg-background'
                }`}
              >
                {d && (
                  <>
                    <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-accent font-bold' : isWeekend ? 'text-primary/40' : 'text-primary/70'}`}>
                      {d.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayOrders.map(({ order, color, start, end }) => {
                        const isFirst = isoDate(d) === isoDate(start);
                        const isLast  = isoDate(d) === isoDate(end);
                        return (
                          <div
                            key={order.id}
                            title={`${order.city} ${order.customer_name} — ${fmtMoney(order.total)}`}
                            className="text-[10px] leading-tight px-1 py-0.5 truncate"
                            style={{
                              backgroundColor: color + '33',
                              borderLeft:  isFirst ? `3px solid ${color}` : 'none',
                              borderRight: isLast  ? `3px solid ${color}` : 'none',
                              borderTop:    '1px solid ' + color + '66',
                              borderBottom: '1px solid ' + color + '66',
                              color: '#3a2a1a',
                              borderRadius: isFirst && isLast ? 4 : isFirst ? '4px 0 0 4px' : isLast ? '0 4px 4px 0' : 0,
                            }}
                          >
                            {isFirst ? `${order.city} ${order.customer_name}` : ''}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── ГЛАВНЫЙ компонент ────────────────────────────────────────────────────────
const AdminCalendar = () => {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'linear' | 'month'>('linear');

  const load = async () => {
    const res  = await fetch(urls['orders']);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activeOrders = orders.filter(o => WORK_STAGES.includes(o.stage) && !o.is_trashed);

  return (
    <div className="p-6">
      {/* Заголовок */}
      <h1 className="font-display text-2xl font-semibold text-primary mb-1">Календарь</h1>
      <p className="text-sm text-primary/70 mb-5">
        Заказов в работе: <span className="font-bold text-primary">{loading ? '...' : activeOrders.length}</span>
      </p>

      {/* Переключатель вида */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('linear')}
          className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
            view === 'linear' ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'
          }`}
        >
          Линейный
        </button>
        <button
          onClick={() => setView('month')}
          className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
            view === 'month' ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'
          }`}
        >
          По месяцам
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Загружаю...</p>
      ) : orders.filter(o => !o.is_trashed).length === 0 ? (
        <p className="text-muted-foreground">Нет заказов для отображения.</p>
      ) : view === 'linear' ? (
        <LinearView orders={orders} />
      ) : (
        <MonthView orders={orders} />
      )}

      {/* Легенда (только линейный) */}
      {!loading && view === 'linear' && (
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-2 rounded-full bg-primary/25 border border-primary/40"></div>
            <span>Срок заказа</span>
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
      )}
    </div>
  );
};

export default AdminCalendar;

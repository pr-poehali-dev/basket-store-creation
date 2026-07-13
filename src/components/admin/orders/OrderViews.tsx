import { useState } from 'react';
import {
  Order, fmtDate, fmtMoney, fmtDateShort,
  responsibleStyle, getDeadlineStatus, weavingPct,
} from '../orderUtils';
import { OrderCard } from './OrderCard';

// ── Shared helpers ──────────────────────────────────────────────────────────
export const LINE_COLORS = [
  '#8A6A4A','#A07850','#7A8A5A','#9B7EC8','#C4A882',
  '#E4879A','#7A9A6A','#A8A8A8','#6B3E26','#D4B060',
];
export function addDaysO(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
export function parseDate(s: string) { if (!s) return null; return new Date(s + 'T00:00:00'); }
function fmtDayNum(d: Date) { return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`; }
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

// ── ListView ──────────────────────────────────────────────────────────────────
export const ListView = ({ orders, onUpdate, onOpenFull }: {
  orders: Order[];
  onUpdate: (id: number, patch: Partial<Order>) => void;
  onOpenFull: (order: Order) => void;
}) => {
  const activeOrders = orders.filter(o => !o.is_archived && !o.is_trashed);
  return (
    <div className="border border-primary/25 rounded-2xl overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-primary/5 text-xs text-primary/60 border-b border-primary/20">
            <th className="px-3 py-2.5 text-left font-semibold">Заказ</th>
            <th className="px-3 py-2.5 text-left font-semibold">Этап</th>
            <th className="px-3 py-2.5 text-left font-semibold">Сумма</th>
            <th className="px-3 py-2.5 text-left font-semibold">Ответственный</th>
            <th className="px-3 py-2.5 text-left font-semibold">Готовность</th>
            <th className="px-3 py-2.5 text-left font-semibold">Плетение</th>
            <th className="px-3 py-2.5 text-left font-semibold">Покраска</th>
            <th className="px-3 py-2.5 text-center font-semibold w-8"></th>
          </tr>
        </thead>
        <tbody>
          {activeOrders.map(o => {
            const dlStatus  = getDeadlineStatus(o);
            const rowCls    = dlStatus === 'burn-weaving' || dlStatus === 'burn-painting' ? 'bg-red-50' :
                              dlStatus === 'warn-weaving' || dlStatus === 'warn-painting' ? 'bg-yellow-50' : '';
            const respStyle = responsibleStyle(o.responsible);
            return (
              <tr key={o.id}
                className={`border-b border-primary/10 last:border-0 hover:bg-primary/3 cursor-pointer ${rowCls}`}
                onClick={() => onOpenFull(o)}>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-primary">{o.city} {o.customer_name}</div>
                  <div className="text-[10px] text-muted-foreground">#{o.order_number} · {fmtDate(o.created_at)}</div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{o.stage}</span>
                </td>
                <td className="px-3 py-2.5 font-bold text-primary whitespace-nowrap">{fmtMoney(o.total)}</td>
                <td className="px-3 py-2.5">
                  {respStyle ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: respStyle.bg, color: respStyle.text }}>
                      {respStyle.name}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2.5 text-xs text-primary/70">{o.due_date ? fmtDateShort(o.due_date) : '—'}</td>
                <td className="px-3 py-2.5 text-xs text-primary/70">{o.due_weaving ? fmtDateShort(o.due_weaving) : '—'}</td>
                <td className="px-3 py-2.5 text-xs text-primary/70">{o.due_painting ? fmtDateShort(o.due_painting) : '—'}</td>
                <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                  <button onClick={() => onOpenFull(o)} className="text-xs text-primary/50 hover:text-primary">↗</button>
                </td>
              </tr>
            );
          })}
          {activeOrders.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Нет активных заказов</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// ── CalendarView ──────────────────────────────────────────────────────────────
export const CalendarView = ({ orders, onOpenFull }: {
  orders: Order[];
  onOpenFull: (o: Order) => void;
}) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });

  const calOrders = orders.filter(o => !o.is_trashed && !o.is_archived);
  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let startWd = firstDay.getDay(); startWd = startWd === 0 ? 6 : startWd - 1;
  const gridDays: (Date | null)[] = Array(startWd).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) gridDays.push(new Date(year, month, d));
  while (gridDays.length % 7 !== 0) gridDays.push(null);

  const orderRows = calOrders.map((o, idx) => ({
    order: o,
    start: o.created_at ? parseDate(o.created_at.slice(0, 10))! : today,
    end:   o.due_date   ? parseDate(o.due_date)! : addDaysO(o.created_at ? parseDate(o.created_at.slice(0, 10))! : today, 14),
    color: LINE_COLORS[idx % LINE_COLORS.length],
  }));

  const ordersOnDay = (d: Date) => orderRows.filter(r => d >= r.start && d <= r.end);
  const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() - 1); setCurrentMonth(d); }}
          className="px-3 py-1 rounded-lg border border-primary/30 text-primary text-sm">←</button>
        <span className="font-semibold text-primary capitalize">{currentMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}</span>
        <button onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() + 1); setCurrentMonth(d); }}
          className="px-3 py-1 rounded-lg border border-primary/30 text-primary text-sm">→</button>
      </div>
      <div className="border border-primary/25 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 bg-primary/5 border-b border-primary/20">
          {WEEKDAYS.map(wd => <div key={wd} className="text-center text-xs font-semibold text-primary/60 py-2">{wd}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {gridDays.map((d, i) => {
            if (!d) return <div key={i} className="min-h-[120px] border-r border-b border-primary/10 bg-primary/2" />;
            const isToday   = isoDate(d) === isoDate(today);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const dayOrders = ordersOnDay(d);
            return (
              <div key={i} className={`min-h-[120px] border-r border-b border-primary/10 p-1.5 ${isToday ? 'bg-accent/10' : isWeekend ? 'bg-primary/3' : 'bg-background'}`}>
                <div className={`text-sm font-bold mb-1 ${isToday ? 'text-accent' : isWeekend ? 'text-primary/40' : 'text-primary/70'}`}>{d.getDate()}</div>
                <div className="space-y-0.5">
                  {dayOrders.map(({ order, color, start, end }) => {
                    const isFirst  = isoDate(d) === isoDate(start);
                    const isLast   = isoDate(d) === isoDate(end);
                    const isMonday = d.getDay() === 1;
                    const showLabel = isFirst || isMonday;
                    return (
                      <div key={order.id}
                        title={`${order.city} ${order.customer_name}`}
                        onClick={() => onOpenFull(order)}
                        className="text-[10px] leading-tight px-1 py-0.5 overflow-hidden cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: color + '33',
                          borderLeft: isFirst ? `3px solid ${color}` : '1px solid ' + color + '44',
                          borderRight: isLast ? `3px solid ${color}` : 'none',
                          borderTop: '1px solid ' + color + '55',
                          borderBottom: '1px solid ' + color + '55',
                          color: '#3a2a1a', minHeight: 18,
                          borderRadius: isFirst && isLast ? 4 : isFirst ? '4px 0 0 4px' : isLast ? '0 4px 4px 0' : 0,
                        }}>
                        {showLabel
                          ? <span className="font-semibold truncate block">{order.city} {order.customer_name}</span>
                          : <span className="opacity-0 select-none">·</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── GanttView ─────────────────────────────────────────────────────────────────
export const GanttView = ({ orders, onOpenFull }: {
  orders: Order[];
  onOpenFull: (o: Order) => void;
}) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const calOrders = orders.filter(o => !o.is_trashed && !o.is_archived);
  const sorted = [...calOrders].sort((a, b) => (!a.due_date ? 1 : !b.due_date ? -1 : a.due_date.localeCompare(b.due_date)));

  let rangeStart = new Date(today); let rangeEnd = addDaysO(today, 30);
  for (const o of sorted) {
    const s = o.created_at ? parseDate(o.created_at.slice(0, 10)) : null;
    const e = o.due_date ? parseDate(o.due_date) : null;
    if (s && s < rangeStart) rangeStart = s;
    if (e && e > rangeEnd)   rangeEnd   = e;
  }
  rangeEnd = addDaysO(rangeEnd, 2);

  const days: Date[] = []; let cur = new Date(rangeStart);
  while (cur <= rangeEnd) { days.push(new Date(cur)); cur = addDaysO(cur, 1); }

  const DAY_W  = 36; const LABEL_W = 220; const ROW_H = 52;
  const dayIdx = (d: Date) => Math.max(0, Math.round((d.getTime() - rangeStart.getTime()) / 86400000));
  const todayIdx = dayIdx(today);

  return (
    <div className="overflow-x-auto rounded-2xl border border-primary/25">
      <div style={{ minWidth: LABEL_W + days.length * DAY_W }}>
        <div className="flex bg-primary/5 border-b border-primary/20 sticky top-0 z-10">
          <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="flex-shrink-0 px-3 py-2 text-xs font-semibold text-primary border-r border-primary/20">Заказ</div>
          {days.map((d, i) => {
            const isToday   = isoDate(d) === isoDate(today);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div key={i} style={{ width: DAY_W, minWidth: DAY_W }}
                className={`text-center text-[10px] py-1 border-r border-primary/10 flex-shrink-0 ${isToday ? 'bg-accent/30 font-bold text-primary' : isWeekend ? 'bg-primary/5 text-primary/40' : 'text-primary/60'}`}>
                <div>{fmtDayNum(d)}</div>
                <div className="text-[9px]">{['вс','пн','вт','ср','чт','пт','сб'][d.getDay()]}</div>
              </div>
            );
          })}
        </div>
        {sorted.map((o, idx) => {
          const start = o.created_at ? parseDate(o.created_at.slice(0, 10))! : today;
          const end   = o.due_date   ? parseDate(o.due_date)! : addDaysO(start, 14);
          const color = LINE_COLORS[idx % LINE_COLORS.length];
          const si = dayIdx(start); const ei = dayIdx(end);
          const barLeft  = Math.max(0, si) * DAY_W + 2;
          const barWidth = Math.max(0, Math.min(ei, days.length - 1) - Math.max(0, si) + 1) * DAY_W - 4;
          return (
            <div key={o.id} className="flex border-b border-primary/10 hover:bg-primary/5 cursor-pointer" style={{ height: ROW_H }} onClick={() => onOpenFull(o)}>
              <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="flex-shrink-0 px-3 py-2 border-r border-primary/20 flex flex-col justify-center">
                <div className="text-xs font-bold text-primary leading-tight">{o.city} {o.customer_name}</div>
                <div className="text-[11px] text-primary/60">{fmtMoney(o.total)}</div>
              </div>
              <div className="relative flex-1 h-full">
                {days.map((_d, i) => {
                  const isToday   = isoDate(_d) === isoDate(today);
                  const isWeekend = _d.getDay() === 0 || _d.getDay() === 6;
                  return (
                    <div key={i} className="absolute top-0 h-full border-r border-primary/10"
                      style={{ left: i * DAY_W, width: DAY_W, backgroundColor: isToday ? 'rgba(139,109,67,0.07)' : isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent' }} />
                  );
                })}
                {barWidth > 0 && (
                  <div className="absolute top-1/2 -translate-y-1/2 rounded-full overflow-hidden"
                    style={{ left: barLeft, width: barWidth, height: 18, backgroundColor: color + '44', border: `2px solid ${color}88` }}>
                    <div className="h-full rounded-full" style={{ width: `${weavingPct(o)}%`, backgroundColor: color + 'bb' }} />
                  </div>
                )}
                <div className="absolute top-0 h-full border-l-2 border-accent/50 z-10" style={{ left: todayIdx * DAY_W }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── KanbanView ────────────────────────────────────────────────────────────────
interface KanbanProps {
  workStages: string[];
  activeOrders: Order[];
  archived: Order[];
  trashed: Order[];
  dragId: number | null;
  setDragId: (id: number | null) => void;
  patchOrder: (id: number, patch: Partial<Order>) => void;
  setFullOrder: (o: Order) => void;
  handleDrop: (stage: string) => void;
}

export const KanbanView = ({
  workStages, activeOrders, archived, trashed,
  setDragId, patchOrder, setFullOrder, handleDrop,
}: KanbanProps) => {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [trashOpen, setTrashOpen]     = useState(false);

  return (
    <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
    <div className="flex gap-0 min-w-max">
      {workStages.map((stage, idx) => {
        const stageOrders = activeOrders.filter(o => o.stage === stage);
        return (
          <div key={stage} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(stage)}
            className={`w-64 flex-shrink-0 px-2 ${idx > 0 ? 'border-l-2 border-primary/20' : ''}`}>
            <h2 className="text-center font-semibold text-primary text-sm pb-3 mb-3 border-b-2 border-primary/20">
              {stage} {stageOrders.length > 0 && <span className="text-xs bg-primary/10 rounded-full px-1.5">{stageOrders.length}</span>}
            </h2>
            <div className="space-y-3 min-h-[200px]">
              {stageOrders.map(order => (
                <OrderCard key={order.id} order={order} onDragStart={setDragId} onUpdate={patchOrder} onOpenFull={setFullOrder} />
              ))}
            </div>
          </div>
        );
      })}
      {/* Archive */}
      <div className="w-64 flex-shrink-0 px-2 border-l border-primary/30">
        <button onClick={() => setArchiveOpen(v => !v)}
          className="w-full text-center font-semibold text-primary text-sm pb-3 mb-3 border-b border-primary/30 flex items-center justify-center gap-1">
          Закрытые {archived.length > 0 && <span className="text-xs bg-primary/10 rounded-full px-1.5">{archived.length}</span>}
          <span className="text-primary/50 text-xs">{archiveOpen ? '▲' : '▼'}</span>
        </button>
        {archiveOpen && (
          <div className="space-y-3">
            {archived.map(o => <OrderCard key={o.id} order={o} onDragStart={setDragId} onUpdate={patchOrder} onOpenFull={setFullOrder} />)}
          </div>
        )}
      </div>
      {/* Trash */}
      <div className="w-64 flex-shrink-0 px-2 border-l border-primary/30">
        <button onClick={() => setTrashOpen(v => !v)}
          className="w-full text-center font-semibold text-red-400 text-sm pb-3 mb-3 border-b border-red-300/30 flex items-center justify-center gap-1">
          Удалённые {trashed.length > 0 && <span className="text-xs bg-red-400/10 rounded-full px-1.5">{trashed.length}</span>}
          <span className="text-red-300 text-xs">{trashOpen ? '▲' : '▼'}</span>
        </button>
        {trashOpen && (
          <div className="space-y-3">
            {trashed.map(o => <OrderCard key={o.id} order={o} onDragStart={setDragId} onUpdate={patchOrder} onOpenFull={setFullOrder} />)}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};
import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';
import {
  STAGES, CLOSED_STAGE, Order, groupPositions, fmtDate, fmtMoney, fmtDateShort,
  RESPONSIBLES, responsibleStyle, DELIVERY_TYPES, DELIVERY_LABELS,
  getDeadlineStatus, weavingPct, paintingPct,
} from './orderUtils';
import OrderFullCard from './OrderFullCard';

type ViewMode = 'kanban' | 'list' | 'calendar' | 'gantt';

// ── Следующий этап ────────────────────────────────────────────────────────────
function nextStage(current: string): string | null {
  const work = STAGES.filter(s => s !== CLOSED_STAGE);
  const idx = work.indexOf(current);
  if (idx === -1 || idx >= work.length - 1) return null;
  return work[idx + 1];
}

// ── Авто-задачи при установке сроков ─────────────────────────────────────────
async function createAutoTasks(order: Order, field: 'due_date' | 'due_weaving' | 'due_painting') {
  try {
    const res = await fetch(urls['staff']);
    const data = await res.json();
    const staff: { id: number; full_name: string; group_name: string; is_active: boolean }[] = data.staff || [];

    const map: Record<string, { group: string; title: string; due: string }> = {
      due_date:    { group: 'Администрация',               title: `Срок готовности: ${order.city} ${order.customer_name}`,  due: order.due_date },
      due_weaving: { group: 'Руководители отделов плетения', title: `Срок плетения: ${order.city} ${order.customer_name}`,    due: order.due_weaving },
      due_painting:{ group: 'Маляр',                        title: `Срок окраски: ${order.city} ${order.customer_name}`,     due: order.due_painting },
    };

    const cfg = map[field];
    const today = new Date().toISOString().slice(0,10);
    const targets = staff.filter(s => s.group_name === cfg.group && s.is_active);
    for (const s of targets) {
      await fetch(urls['tasks'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'task',
          title: cfg.title,
          description: `Заказ #${order.order_number} · ${fmtMoney(order.total)}`,
          assigned_to: s.id,
          assigned_by_name: 'Система',
          priority: 'high',
          due_date: today,
        }),
      });
    }
  } catch { /* не критично */ }
}

// ── Одна карточка заказа (канбан) ─────────────────────────────────────────────
const OrderCard = ({ order, onDragStart, onUpdate, onOpenFull }: {
  order: Order;
  onDragStart: (id: number) => void;
  onUpdate: (id: number, patch: Partial<Order>) => void;
  onOpenFull: (order: Order) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const positions = groupPositions(order.items);
  const dlStatus  = getDeadlineStatus(order);
  const isQueue   = order.stage === 'В очереди на плетение';
  const isApproval = order.stage === 'Согласование';
  const isClosed   = order.stage === CLOSED_STAGE;
  const respStyle  = responsibleStyle(order.responsible);
  const wPct = weavingPct(order);
  const pPct = paintingPct(order);
  const showProgress = ['В очереди на плетение','Плетение', 'Малярка', 'Упаковка', 'Доставка'].includes(order.stage);
  const next = nextStage(order.stage);

  const canMoveNext = (() => {
    if (order.stage === 'Согласование') return !!order.due_date;
    if (order.stage === 'В очереди на плетение') return !!order.due_weaving && !!order.due_painting;
    return true;
  })();

  const headerBg =
    dlStatus === 'burn-weaving' || dlStatus === 'burn-painting'  ? 'bg-red-500/15 border-red-400/60'    :
    dlStatus === 'warn-weaving' || dlStatus === 'warn-painting'  ? 'bg-yellow-400/15 border-yellow-400/60' :
    'bg-card border-primary/40';
  const hoverBorder =
    dlStatus === 'burn-weaving' || dlStatus === 'burn-painting'  ? 'hover:border-red-500'    :
    dlStatus === 'warn-weaving' || dlStatus === 'warn-painting'  ? 'hover:border-yellow-500' :
    'hover:border-primary';

  const handleUpdate = async (patch: Partial<Order>) => {
    onUpdate(order.id, patch);
    if (patch.due_date    && !order.due_date)    await createAutoTasks({ ...order, ...patch }, 'due_date');
    if (patch.due_weaving && !order.due_weaving) await createAutoTasks({ ...order, ...patch }, 'due_weaving');
    if (patch.due_painting && !order.due_painting) await createAutoTasks({ ...order, ...patch }, 'due_painting');
  };

  return (
    <div draggable onDragStart={() => onDragStart(order.id)}
      className="rounded-2xl border cursor-pointer select-none overflow-hidden transition-colors">
      <div className={`p-3 ${headerBg} ${hoverBorder} transition-colors`} onClick={() => setExpanded(v => !v)}>
        {(dlStatus === 'burn-weaving' || dlStatus === 'burn-painting') && (
          <div className="mb-2 -mx-1 -mt-1">
            <span className="block text-center text-[11px] font-bold text-white bg-red-500 rounded-md py-1 px-2 animate-pulse">🔥 ГОРИМ ПО СРОКАМ!</span>
          </div>
        )}
        {(dlStatus === 'warn-weaving' || dlStatus === 'warn-painting') && (
          <div className="mb-2 -mx-1 -mt-1">
            <span className="block text-center text-[11px] font-bold text-yellow-800 bg-yellow-300/80 rounded-md py-1 px-2">⏰ 1 день до дедлайна</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {order.delivery_type && DELIVERY_TYPES[order.delivery_type] && (
            <span title={DELIVERY_LABELS[order.delivery_type]} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
              {DELIVERY_TYPES[order.delivery_type]}
            </span>
          )}
          {respStyle && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: respStyle.bg, color: respStyle.text }}>
              {respStyle.name}
            </span>
          )}
          {order.due_date && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-primary border border-accent/30">
              до {fmtDateShort(order.due_date)}
            </span>
          )}
          {/* Кнопка открыть полностью */}
          <button
            onClick={e => { e.stopPropagation(); onOpenFull(order); }}
            className="ml-auto text-[10px] px-1.5 py-0.5 rounded-lg border border-primary/25 text-primary/60 hover:text-primary hover:border-primary transition-colors"
          >
            ↗
          </button>
        </div>
        <div className="font-bold text-primary leading-tight break-words">{order.city} {order.customer_name}</div>
        <div className="font-bold text-primary">{fmtMoney(order.total)}</div>
        {showProgress && (
          <div className="mt-2 space-y-1.5">
            <div>
              <div className="flex justify-between text-[10px] text-primary/70 mb-0.5"><span>Сплетено</span><span className="font-semibold" style={{color:'#6b7c3a'}}>{wPct}%</span></div>
              <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${wPct}%`, backgroundColor: '#8a9a5a' }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-primary/70 mb-0.5"><span>Покрашено</span><span className="font-semibold" style={{color:'#6b7c3a'}}>{pPct}%</span></div>
              <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pPct}%`, backgroundColor: '#8a9a5a' }} /></div>
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="bg-card border-t border-primary/20 p-3 space-y-3" onClick={e => e.stopPropagation()}>
          {/* Согласование: ответственный + дата готовности */}
          {isApproval && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-primary/60 block mb-1">Ответственный</label>
                <select value={order.responsible || ''} onChange={e => handleUpdate({ responsible: e.target.value })}
                  className="w-full text-xs border border-primary/30 rounded-md px-2 py-1 bg-background outline-none focus:border-accent">
                  <option value="">— не выбран —</option>
                  {RESPONSIBLES.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-primary/60 block mb-1">Дата готовности <span className="text-red-400">*</span></label>
                <input type="date" value={order.due_date || ''} onChange={e => handleUpdate({ due_date: e.target.value })}
                  className={`w-full text-xs border rounded-md px-2 py-1 bg-background outline-none focus:border-accent ${!order.due_date ? 'border-red-400' : 'border-primary/30'}`} />
                {!order.due_date && <p className="text-[10px] text-red-400 mt-0.5">Обязательное поле</p>}
              </div>
            </div>
          )}

          {/* В очереди на плетение: сроки плетения и покраски */}
          {isQueue && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-primary/60 block mb-1">Срок плетения <span className="text-red-400">*</span></label>
                <input type="date" value={order.due_weaving || ''} onChange={e => handleUpdate({ due_weaving: e.target.value })}
                  className={`w-full text-xs border rounded-md px-2 py-1 bg-background outline-none focus:border-accent ${!order.due_weaving ? 'border-red-400' : 'border-primary/30'}`} />
                {!order.due_weaving && <p className="text-[10px] text-red-400 mt-0.5">Обязательное поле</p>}
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-primary/60 block mb-1">Срок окраски <span className="text-red-400">*</span></label>
                <input type="date" value={order.due_painting || ''} onChange={e => handleUpdate({ due_painting: e.target.value })}
                  className={`w-full text-xs border rounded-md px-2 py-1 bg-background outline-none focus:border-accent ${!order.due_painting ? 'border-red-400' : 'border-primary/30'}`} />
                {!order.due_painting && <p className="text-[10px] text-red-400 mt-0.5">Обязательное поле</p>}
              </div>
            </div>
          )}

          {/* Позиции — без внешней окантовки */}
          {positions.length > 0 && (
            <div>
              <button onClick={() => setShowColors(v => !v)} className="text-[11px] text-primary/70 hover:text-primary mb-2">
                {showColors ? 'скрыть цвета' : 'открыть цвета'}
              </button>
              <div>
                {positions.map(pos => (
                  <div key={pos.key}>
                    <div className="flex justify-between items-center gap-2 px-2 py-1 bg-primary/5 border-b border-primary/20">
                      <span className="font-bold text-primary text-xs break-words">{pos.title}</span>
                      <span className="font-bold text-primary text-xs flex-shrink-0">{pos.total}</span>
                    </div>
                    {showColors && pos.colors.map((c, i) => (
                      <div key={i} className="flex justify-between items-center gap-2 px-2 py-1 border-b border-primary/10 last:border-0">
                        <span className="text-primary/80 text-[11px]">{c.color}</span>
                        <span className="text-primary/80 text-[11px]">{c.qty}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Кнопка следующей стадии */}
          {next && !isClosed && !order.is_trashed && (
            canMoveNext ? (
              <button onClick={() => onUpdate(order.id, { stage: next, is_archived: next === CLOSED_STAGE })}
                className="w-full text-xs font-semibold py-2 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground transition-colors">
                → {next}
              </button>
            ) : (
              <div className="text-xs text-center py-2 rounded-xl bg-red-50 border border-red-200 text-red-500">
                Заполните обязательные поля для перехода
              </div>
            )
          )}

          {/* Архив / удаление */}
          <div className="flex gap-2 pt-1 border-t border-primary/10">
            {isClosed ? (
              <button onClick={() => onUpdate(order.id, { stage: 'Новый заказ', is_archived: false })} className="text-[11px] text-primary/70 hover:text-primary underline">Вернуть в работу</button>
            ) : order.is_trashed ? (
              <button onClick={() => onUpdate(order.id, { is_trashed: false })} className="text-[11px] text-primary/70 hover:text-primary underline">Восстановить</button>
            ) : (
              <>
                <button onClick={() => onUpdate(order.id, { stage: CLOSED_STAGE, is_archived: true })} className="text-[11px] text-primary/70 hover:text-primary underline">В архив</button>
                <button onClick={() => onUpdate(order.id, { is_trashed: true })} className="text-[11px] text-red-400 hover:text-red-600 underline">Удалить</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Список (таблица) ──────────────────────────────────────────────────────────
const ListView = ({ orders, onUpdate, onOpenFull }: {
  orders: Order[];
  onUpdate: (id: number, patch: Partial<Order>) => void;
  onOpenFull: (order: Order) => void;
}) => {
  const activeOrders   = orders.filter(o => !o.is_archived && !o.is_trashed);
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
            const dlStatus = getDeadlineStatus(o);
            const rowCls = dlStatus === 'burn-weaving' || dlStatus === 'burn-painting' ? 'bg-red-50' :
                           dlStatus === 'warn-weaving' || dlStatus === 'warn-painting' ? 'bg-yellow-50' : '';
            const respStyle = responsibleStyle(o.responsible);
            return (
              <tr key={o.id} className={`border-b border-primary/10 last:border-0 hover:bg-primary/3 cursor-pointer ${rowCls}`}
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
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: respStyle.bg, color: respStyle.text }}>{respStyle.name}</span>
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

// ── Месячный календарь ────────────────────────────────────────────────────────
const LINE_COLORS = ['#8A6A4A','#A07850','#7A8A5A','#9B7EC8','#C4A882','#E4879A','#7A9A6A','#A8A8A8','#6B3E26','#D4B060'];
function addDaysO(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function parseDate(s: string) { if (!s) return null; return new Date(s+'T00:00:00'); }
function fmtDayNum(d: Date) { return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`; }

const CalendarView = ({ orders, onOpenFull }: { orders: Order[]; onOpenFull: (o: Order) => void }) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const [currentMonth, setCurrentMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const calOrders = orders.filter(o => !o.is_trashed && !o.is_archived);
  const year = currentMonth.getFullYear(); const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month+1, 0);
  let startWd = firstDay.getDay(); startWd = startWd===0 ? 6 : startWd-1;
  const gridDays: (Date|null)[] = Array(startWd).fill(null);
  for (let d=1; d<=lastDay.getDate(); d++) gridDays.push(new Date(year,month,d));
  while (gridDays.length%7!==0) gridDays.push(null);
  const orderRows = calOrders.map((o,idx) => ({
    order: o,
    start: o.created_at ? parseDate(o.created_at.slice(0,10))! : today,
    end:   o.due_date   ? parseDate(o.due_date)! : addDaysO(o.created_at ? parseDate(o.created_at.slice(0,10))! : today, 14),
    color: LINE_COLORS[idx % LINE_COLORS.length],
  }));
  const ordersOnDay = (d: Date) => orderRows.filter(r => d >= r.start && d <= r.end);
  const isoDate = (d: Date) => d.toISOString().slice(0,10);
  const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => { const d=new Date(currentMonth); d.setMonth(d.getMonth()-1); setCurrentMonth(d); }} className="px-3 py-1 rounded-lg border border-primary/30 text-primary text-sm">←</button>
        <span className="font-semibold text-primary capitalize">{currentMonth.toLocaleString('ru-RU',{month:'long',year:'numeric'})}</span>
        <button onClick={() => { const d=new Date(currentMonth); d.setMonth(d.getMonth()+1); setCurrentMonth(d); }} className="px-3 py-1 rounded-lg border border-primary/30 text-primary text-sm">→</button>
      </div>
      <div className="border border-primary/25 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 bg-primary/5 border-b border-primary/20">
          {WEEKDAYS.map(wd => <div key={wd} className="text-center text-xs font-semibold text-primary/60 py-2">{wd}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {gridDays.map((d, i) => {
            if (!d) return <div key={i} className="min-h-[120px] border-r border-b border-primary/10 bg-primary/2" />;
            const isToday   = isoDate(d) === isoDate(today);
            const isWeekend = d.getDay()===0 || d.getDay()===6;
            const dayOrders = ordersOnDay(d);
            return (
              <div key={i} className={`min-h-[120px] border-r border-b border-primary/10 p-1.5 ${isToday?'bg-accent/10':isWeekend?'bg-primary/3':'bg-background'}`}>
                <div className={`text-sm font-bold mb-1 ${isToday?'text-accent':isWeekend?'text-primary/40':'text-primary/70'}`}>{d.getDate()}</div>
                <div className="space-y-0.5">
                  {dayOrders.map(({ order, color, start, end }) => {
                    const isFirst = isoDate(d)===isoDate(start);
                    const isLast  = isoDate(d)===isoDate(end);
                    const isMonday = d.getDay()===1;
                    const showLabel = isFirst || isMonday;
                    return (
                      <div key={order.id} title={`${order.city} ${order.customer_name}`}
                        onClick={() => onOpenFull(order)}
                        className="text-[10px] leading-tight px-1 py-0.5 overflow-hidden cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: color+'33',
                          borderLeft: isFirst ? `3px solid ${color}` : '1px solid '+color+'44',
                          borderRight: isLast ? `3px solid ${color}` : 'none',
                          borderTop: '1px solid '+color+'55', borderBottom: '1px solid '+color+'55',
                          color: '#3a2a1a', minHeight: 18,
                          borderRadius: isFirst&&isLast?4:isFirst?'4px 0 0 4px':isLast?'0 4px 4px 0':0,
                        }}>
                        {showLabel ? <span className="font-semibold truncate block">{order.city} {order.customer_name}</span> : <span className="opacity-0 select-none">·</span>}
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

// ── Ганнт ─────────────────────────────────────────────────────────────────────
const GanttView = ({ orders, onOpenFull }: { orders: Order[]; onOpenFull: (o: Order) => void }) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const calOrders = orders.filter(o => !o.is_trashed && !o.is_archived);
  const sorted = [...calOrders].sort((a,b) => (!a.due_date?1:!b.due_date?-1:a.due_date.localeCompare(b.due_date)));
  let rangeStart = new Date(today); let rangeEnd = addDaysO(today,30);
  for (const o of sorted) {
    const s = o.created_at ? parseDate(o.created_at.slice(0,10)) : null;
    const e = o.due_date ? parseDate(o.due_date) : null;
    if (s && s < rangeStart) rangeStart = s;
    if (e && e > rangeEnd) rangeEnd = e;
  }
  rangeEnd = addDaysO(rangeEnd, 2);
  const days: Date[] = []; let cur = new Date(rangeStart);
  while (cur <= rangeEnd) { days.push(new Date(cur)); cur = addDaysO(cur,1); }
  const DAY_W=36; const LABEL_W=220; const ROW_H=52;
  const dayIdx = (d: Date) => Math.max(0, Math.round((d.getTime()-rangeStart.getTime())/86400000));
  const todayIdx = dayIdx(today);
  const isoDate = (d: Date) => d.toISOString().slice(0,10);
  return (
    <div className="overflow-x-auto rounded-2xl border border-primary/25">
      <div style={{ minWidth: LABEL_W + days.length * DAY_W }}>
        <div className="flex bg-primary/5 border-b border-primary/20 sticky top-0 z-10">
          <div style={{width:LABEL_W,minWidth:LABEL_W}} className="flex-shrink-0 px-3 py-2 text-xs font-semibold text-primary border-r border-primary/20">Заказ</div>
          {days.map((d,i) => {
            const isToday=isoDate(d)===isoDate(today); const isWeekend=d.getDay()===0||d.getDay()===6;
            return (
              <div key={i} style={{width:DAY_W,minWidth:DAY_W}} className={`text-center text-[10px] py-1 border-r border-primary/10 flex-shrink-0 ${isToday?'bg-accent/30 font-bold text-primary':isWeekend?'bg-primary/5 text-primary/40':'text-primary/60'}`}>
                <div>{fmtDayNum(d)}</div><div className="text-[9px]">{['вс','пн','вт','ср','чт','пт','сб'][d.getDay()]}</div>
              </div>
            );
          })}
        </div>
        {sorted.map((o, idx) => {
          const start = o.created_at ? parseDate(o.created_at.slice(0,10))! : today;
          const end   = o.due_date   ? parseDate(o.due_date)! : addDaysO(start, 14);
          const color = LINE_COLORS[idx%LINE_COLORS.length];
          const si = dayIdx(start); const ei = dayIdx(end);
          const barLeft  = Math.max(0,si)*DAY_W+2;
          const barWidth = Math.max(0, Math.min(ei,days.length-1)-Math.max(0,si)+1)*DAY_W-4;
          return (
            <div key={o.id} className="flex border-b border-primary/10 hover:bg-primary/5 cursor-pointer" style={{height:ROW_H}} onClick={() => onOpenFull(o)}>
              <div style={{width:LABEL_W,minWidth:LABEL_W}} className="flex-shrink-0 px-3 py-2 border-r border-primary/20 flex flex-col justify-center">
                <div className="text-xs font-bold text-primary leading-tight">{o.city} {o.customer_name}</div>
                <div className="text-[11px] text-primary/60">{fmtMoney(o.total)}</div>
              </div>
              <div className="relative flex-1 h-full">
                {days.map((_d,i) => {
                  const isToday=isoDate(_d)===isoDate(today); const isWeekend=_d.getDay()===0||_d.getDay()===6;
                  return <div key={i} className="absolute top-0 h-full border-r border-primary/10" style={{left:i*DAY_W,width:DAY_W,backgroundColor:isToday?'rgba(139,109,67,0.07)':isWeekend?'rgba(0,0,0,0.02)':'transparent'}} />;
                })}
                {barWidth>0 && (
                  <div className="absolute top-1/2 -translate-y-1/2 rounded-full overflow-hidden"
                    style={{left:barLeft,width:barWidth,height:18,backgroundColor:color+'44',border:`2px solid ${color}88`}}>
                    <div className="h-full rounded-full" style={{width:`${weavingPct(o)}%`,backgroundColor:color+'bb'}} />
                  </div>
                )}
                <div className="absolute top-0 h-full border-l-2 border-accent/50 z-10" style={{left:todayIdx*DAY_W}} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Колонка архива ────────────────────────────────────────────────────────────
const ArchiveColumn = ({ orders, onDragStart, onUpdate, onOpenFull }: { orders: Order[]; onDragStart: (id: number) => void; onUpdate: (id: number, patch: Partial<Order>) => void; onOpenFull: (o: Order) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-64 flex-shrink-0 px-2 border-l border-primary/30">
      <button onClick={() => setOpen(v => !v)} className="w-full text-center font-semibold text-primary text-sm pb-3 mb-3 border-b border-primary/30 flex items-center justify-center gap-1">
        Закрытые {orders.length>0 && <span className="text-xs bg-primary/10 rounded-full px-1.5">{orders.length}</span>}
        <span className="text-primary/50 text-xs">{open?'▲':'▼'}</span>
      </button>
      {open && <div className="space-y-3">{orders.map(o => <OrderCard key={o.id} order={o} onDragStart={onDragStart} onUpdate={onUpdate} onOpenFull={onOpenFull} />)}</div>}
    </div>
  );
};
const TrashColumn = ({ orders, onDragStart, onUpdate, onOpenFull }: { orders: Order[]; onDragStart: (id: number) => void; onUpdate: (id: number, patch: Partial<Order>) => void; onOpenFull: (o: Order) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-64 flex-shrink-0 px-2 border-l border-primary/30">
      <button onClick={() => setOpen(v => !v)} className="w-full text-center font-semibold text-red-400 text-sm pb-3 mb-3 border-b border-red-300/30 flex items-center justify-center gap-1">
        Удалённые {orders.length>0 && <span className="text-xs bg-red-400/10 rounded-full px-1.5">{orders.length}</span>}
        <span className="text-red-300 text-xs">{open?'▲':'▼'}</span>
      </button>
      {open && <div className="space-y-3">{orders.map(o => <OrderCard key={o.id} order={o} onDragStart={onDragStart} onUpdate={onUpdate} onOpenFull={onOpenFull} />)}</div>}
    </div>
  );
};

// ── Мини-окно клиента из базы ─────────────────────────────────────────────────
interface ClientInfo {
  id: number; full_name: string; phone: string; email: string; city: string;
  order_count: number; total_sum: number;
}
const ClientModal = ({ phone, name, onClose }: { phone: string; name: string; onClose: () => void }) => {
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(urls['clients']);
        const data = await res.json();
        const found = (data.clients || []).find((c: ClientInfo) => c.phone === phone || c.full_name === name);
        setClient(found || null);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [phone, name]);
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-primary/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-primary text-lg">Клиент</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-primary text-xl">✕</button>
        </div>
        {loading ? <p className="text-muted-foreground text-sm">Загружаю...</p> :
         !client ? <p className="text-muted-foreground text-sm">Клиент не найден в базе.</p> : (
          <div className="space-y-3">
            <div>
              <div className="font-bold text-primary text-base">{client.full_name}</div>
              {client.city && <div className="text-sm text-muted-foreground">{client.city}</div>}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {client.phone && <><div className="text-muted-foreground">Телефон</div><div className="text-primary">{client.phone}</div></>}
              {client.email && <><div className="text-muted-foreground">Email</div><div className="text-primary">{client.email}</div></>}
              <div className="text-muted-foreground">Заказов</div><div className="font-bold text-primary">{client.order_count}</div>
              <div className="text-muted-foreground">Сумма</div><div className="font-bold text-primary">{client.total_sum.toLocaleString('ru-RU')} ₽</div>
            </div>
            <a href="/admin/clients" className="text-xs text-accent hover:underline">Открыть в базе клиентов →</a>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Главный компонент ─────────────────────────────────────────────────────────
const AdminOrders = () => {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId]   = useState<number | null>(null);
  const [view, setView]       = useState<ViewMode>('kanban');
  const [fullOrder, setFullOrder] = useState<Order | null>(null);
  const [clientModal, setClientModal] = useState<{ phone: string; name: string } | null>(null);

  const load = async () => {
    const res = await fetch(urls['orders']);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patchOrder = async (id: number, patch: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
    if (fullOrder?.id === id) setFullOrder(prev => prev ? { ...prev, ...patch } : prev);
    await fetch(urls['orders'], { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) });
  };

  const handleDrop = (stage: string) => {
    if (dragId === null) return;
    const order = orders.find(o => o.id === dragId);
    if (!order) return;
    if (stage === 'В очереди на плетение' && !order.due_date) { alert('Заполните дату готовности перед переводом'); return; }
    if (stage === 'Плетение' && (!order.due_weaving || !order.due_painting)) { alert('Заполните срок плетения и окраски перед переводом в Плетение'); return; }
    patchOrder(dragId, { stage, is_archived: stage === CLOSED_STAGE });
    setDragId(null);
  };

  const workStages   = STAGES.filter(s => s !== CLOSED_STAGE);
  const activeOrders = orders.filter(o => !o.is_archived && !o.is_trashed);
  const archived     = orders.filter(o => o.is_archived && !o.is_trashed);
  const trashed      = orders.filter(o => o.is_trashed);

  const VIEW_BUTTONS: { key: ViewMode; icon: string; label: string }[] = [
    { key: 'kanban',   icon: 'Columns2',    label: 'Канбан'    },
    { key: 'list',     icon: 'List',        label: 'Список'    },
    { key: 'calendar', icon: 'CalendarDays',label: 'Календарь' },
    { key: 'gantt',    icon: 'BarChart2',   label: 'Ганнт'     },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-display text-2xl font-semibold text-primary">Заказы</h1>
        {/* Переключатель вида */}
        <div className="flex gap-1.5">
          {VIEW_BUTTONS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${view === v.key ? 'bg-primary text-white border-primary' : 'border-primary/30 text-primary hover:border-primary'}`}>
              <Icon name={v.icon} size={14} />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Загружаю...</p>
      ) : view === 'kanban' ? (
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
                  {stageOrders.map(order => <OrderCard key={order.id} order={order} onDragStart={setDragId} onUpdate={patchOrder} onOpenFull={setFullOrder} />)}
                </div>
              </div>
            );
          })}
          <ArchiveColumn orders={archived} onDragStart={setDragId} onUpdate={patchOrder} onOpenFull={setFullOrder} />
          <TrashColumn   orders={trashed}  onDragStart={setDragId} onUpdate={patchOrder} onOpenFull={setFullOrder} />
        </div>
      ) : view === 'list' ? (
        <ListView orders={orders} onUpdate={patchOrder} onOpenFull={setFullOrder} />
      ) : view === 'calendar' ? (
        <CalendarView orders={orders} onOpenFull={setFullOrder} />
      ) : (
        <GanttView orders={orders} onOpenFull={setFullOrder} />
      )}

      {/* Полная карточка заказа */}
      {fullOrder && (
        <OrderFullCard
          order={fullOrder}
          onClose={() => setFullOrder(null)}
          onUpdate={patchOrder}
          onOpenClient={(phone, name) => setClientModal({ phone, name })}
        />
      )}

      {/* Мини-окно клиента */}
      {clientModal && (
        <ClientModal
          phone={clientModal.phone}
          name={clientModal.name}
          onClose={() => setClientModal(null)}
        />
      )}
    </div>
  );
};

export default AdminOrders;
import { useState } from 'react';
import {
  Order, groupPositions, displayTitle, fmtMoney, fmtDateShort,
  RESPONSIBLES, responsibleStyle, DELIVERY_TYPES, DELIVERY_LABELS,
  getDeadlineStatus, weavingPct, paintingPct, CLOSED_STAGE, canAdvanceStage,
} from '../orderUtils';
import { nextStage, createAutoTasks } from './orderHelpers';

interface OrderCardProps {
  order: Order;
  onDragStart: (id: number) => void;
  onUpdate: (id: number, patch: Partial<Order>) => void;
  onOpenFull: (order: Order) => void;
}

export const OrderCard = ({ order, onDragStart, onUpdate, onOpenFull }: OrderCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const positions  = groupPositions(order.items);
  const dlStatus   = getDeadlineStatus(order);
  const isQueue    = order.stage === 'В очереди на плетение';
  const isApproval = order.stage === 'Согласование';
  const isClosed   = order.stage === CLOSED_STAGE;
  const respStyle  = responsibleStyle(order.responsible);
  const wPct = weavingPct(order);
  const pPct = paintingPct(order);
  const showProgress = ['В очереди на плетение', 'Плетение', 'Малярка', 'Упаковка', 'Доставка'].includes(order.stage);
  const next = nextStage(order.stage);

  const canMoveNext = (() => {
    if (order.stage === 'Согласование') return !!order.due_date;
    if (order.stage === 'В очереди на плетение') return !!order.due_weaving && !!order.due_painting;
    return true;
  })();

  const headerBg =
    dlStatus === 'burn-weaving' || dlStatus === 'burn-painting'  ? 'bg-red-500/15 border-red-400/60'       :
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
              <div className="flex justify-between text-[10px] text-primary/70 mb-0.5">
                <span>Сплетено</span><span className="font-semibold" style={{ color: '#6b7c3a' }}>{wPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${wPct}%`, backgroundColor: '#8a9a5a' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-primary/70 mb-0.5">
                <span>Покрашено</span><span className="font-semibold" style={{ color: '#6b7c3a' }}>{pPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pPct}%`, backgroundColor: '#8a9a5a' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="bg-card border-t border-primary/20 p-3 space-y-3" onClick={e => e.stopPropagation()}>
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
                <label className="text-[10px] uppercase tracking-wider text-primary/60 block mb-1">
                  Дата готовности <span className="text-red-400">*</span>
                </label>
                <input type="date" value={order.due_date || ''} onChange={e => handleUpdate({ due_date: e.target.value })}
                  className={`w-full text-xs border rounded-md px-2 py-1 bg-background outline-none focus:border-accent ${!order.due_date ? 'border-red-400' : 'border-primary/30'}`} />
                {!order.due_date && <p className="text-[10px] text-red-400 mt-0.5">Обязательное поле</p>}
              </div>
            </div>
          )}

          {isQueue && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-primary/60 block mb-1">
                  Срок плетения <span className="text-red-400">*</span>
                </label>
                <input type="date" value={order.due_weaving || ''} onChange={e => handleUpdate({ due_weaving: e.target.value })}
                  className={`w-full text-xs border rounded-md px-2 py-1 bg-background outline-none focus:border-accent ${!order.due_weaving ? 'border-red-400' : 'border-primary/30'}`} />
                {!order.due_weaving && <p className="text-[10px] text-red-400 mt-0.5">Обязательное поле</p>}
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-primary/60 block mb-1">
                  Срок окраски <span className="text-red-400">*</span>
                </label>
                <input type="date" value={order.due_painting || ''} onChange={e => handleUpdate({ due_painting: e.target.value })}
                  className={`w-full text-xs border rounded-md px-2 py-1 bg-background outline-none focus:border-accent ${!order.due_painting ? 'border-red-400' : 'border-primary/30'}`} />
                {!order.due_painting && <p className="text-[10px] text-red-400 mt-0.5">Обязательное поле</p>}
              </div>
            </div>
          )}

          {positions.length > 0 && (
            <div>
              <button onClick={() => setShowColors(v => !v)} className="text-[11px] text-primary/70 hover:text-primary mb-2">
                {showColors ? 'скрыть цвета' : 'открыть цвета'}
              </button>
              <div>
                {positions.map(pos => (
                  <div key={pos.key}>
                    <div className="flex justify-between items-center gap-2 px-2 py-1 bg-primary/5 border-b border-primary/20">
                      <span className="font-bold text-primary text-xs break-words">{displayTitle(pos.title)}</span>
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

          {next && !isClosed && !order.is_trashed && (() => {
            if (!canMoveNext) return (
              <div className="text-xs text-center py-2 rounded-xl bg-red-50 border border-red-200 text-red-500">
                Заполните обязательные поля для перехода
              </div>
            );
            const stageCheck = canAdvanceStage(order, next);
            if (!stageCheck.ok) return (
              <div className="text-xs text-center py-2 rounded-xl bg-red-50 border border-red-200 text-red-500">
                {stageCheck.reason}
              </div>
            );
            return (
              <button onClick={() => onUpdate(order.id, { stage: next, is_archived: next === CLOSED_STAGE })}
                className="w-full text-xs font-semibold py-2 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground transition-colors">
                → {next}
              </button>
            );
          })()}

          <div className="flex gap-2 pt-1 border-t border-primary/10">
            {isClosed ? (
              <button onClick={() => onUpdate(order.id, { stage: 'Новый заказ', is_archived: false })}
                className="text-[11px] text-primary/70 hover:text-primary underline">Вернуть в работу</button>
            ) : order.is_trashed ? (
              <button onClick={() => onUpdate(order.id, { is_trashed: false })}
                className="text-[11px] text-primary/70 hover:text-primary underline">Восстановить</button>
            ) : (
              <>
                <button onClick={() => onUpdate(order.id, { stage: CLOSED_STAGE, is_archived: true })}
                  className="text-[11px] text-primary/70 hover:text-primary underline">В архив</button>
                <button onClick={() => onUpdate(order.id, { is_trashed: true })}
                  className="text-[11px] text-red-400 hover:text-red-600 underline">Удалить</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ColProps {
  orders: Order[];
  onDragStart: (id: number) => void;
  onUpdate: (id: number, patch: Partial<Order>) => void;
  onOpenFull: (o: Order) => void;
}

export const ArchiveColumn = ({ orders, onDragStart, onUpdate, onOpenFull }: ColProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-64 flex-shrink-0 px-2 border-l border-primary/30">
      <button onClick={() => setOpen(v => !v)}
        className="w-full text-center font-semibold text-primary text-sm pb-3 mb-3 border-b border-primary/30 flex items-center justify-center gap-1">
        Закрытые {orders.length > 0 && <span className="text-xs bg-primary/10 rounded-full px-1.5">{orders.length}</span>}
        <span className="text-primary/50 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="space-y-3">
          {orders.map(o => <OrderCard key={o.id} order={o} onDragStart={onDragStart} onUpdate={onUpdate} onOpenFull={onOpenFull} />)}
        </div>
      )}
    </div>
  );
};

export const TrashColumn = ({ orders, onDragStart, onUpdate, onOpenFull }: ColProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-64 flex-shrink-0 px-2 border-l border-primary/30">
      <button onClick={() => setOpen(v => !v)}
        className="w-full text-center font-semibold text-red-400 text-sm pb-3 mb-3 border-b border-red-300/30 flex items-center justify-center gap-1">
        Удалённые {orders.length > 0 && <span className="text-xs bg-red-400/10 rounded-full px-1.5">{orders.length}</span>}
        <span className="text-red-300 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="space-y-3">
          {orders.map(o => <OrderCard key={o.id} order={o} onDragStart={onDragStart} onUpdate={onUpdate} onOpenFull={onOpenFull} />)}
        </div>
      )}
    </div>
  );
};
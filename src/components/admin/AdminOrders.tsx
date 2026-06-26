import { useState, useEffect } from 'react';
import urls from '../../../backend/func2url.json';
import {
  STAGES, CLOSED_STAGE, Order, groupPositions, fmtDate, fmtMoney, fmtDateShort,
  RESPONSIBLES, responsibleStyle, DELIVERY_TYPES, DELIVERY_LABELS,
  getDeadlineStatus, weavingPct, paintingPct,
} from './orderUtils';

// Карточка заказа
const OrderCard = ({ order, onDragStart, onUpdate }: {
  order: Order;
  onDragStart: (id: number) => void;
  onUpdate: (id: number, patch: Partial<Order>) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const positions = groupPositions(order.items);
  const dlStatus = getDeadlineStatus(order);
  const isApproval = order.stage === 'Согласование';
  const isWeaving  = order.stage === 'Плетение';
  const isClosed   = order.stage === CLOSED_STAGE;
  const respStyle  = responsibleStyle(order.responsible);
  const wPct = weavingPct(order);
  const pPct = paintingPct(order);
  const showProgress = ['Плетение', 'Малярка', 'Упаковка', 'Доставка'].includes(order.stage);

  // Цвет фона верхней части карточки
  const headerBg =
    dlStatus === 'burn-weaving' || dlStatus === 'burn-painting'
      ? 'bg-red-500/15 border-red-400/60'
      : dlStatus === 'warn-weaving' || dlStatus === 'warn-painting'
      ? 'bg-yellow-400/15 border-yellow-400/60'
      : 'bg-card border-primary/40';

  const hoverBorder =
    dlStatus === 'burn-weaving' || dlStatus === 'burn-painting'
      ? 'hover:border-red-500'
      : dlStatus === 'warn-weaving' || dlStatus === 'warn-painting'
      ? 'hover:border-yellow-500'
      : 'hover:border-primary';

  return (
    <div
      draggable
      onDragStart={() => onDragStart(order.id)}
      className="rounded-2xl border cursor-pointer select-none overflow-hidden transition-colors"
    >
      {/* ВЕРХНЯЯ часть — окрашивается при дедлайне */}
      <div
        className={`p-3 ${headerBg} ${hoverBorder} transition-colors`}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Плашка горим/предупреждение */}
        {(dlStatus === 'burn-weaving' || dlStatus === 'burn-painting') && (
          <div className="mb-2 -mx-1 -mt-1">
            <span className="block text-center text-[11px] font-bold text-white bg-red-500 rounded-md py-1 px-2 animate-pulse">
              🔥 ГОРИМ ПО СРОКАМ!
            </span>
          </div>
        )}
        {(dlStatus === 'warn-weaving' || dlStatus === 'warn-painting') && (
          <div className="mb-2 -mx-1 -mt-1">
            <span className="block text-center text-[11px] font-bold text-yellow-800 bg-yellow-300/80 rounded-md py-1 px-2">
              ⏰ 1 день до дедлайна
            </span>
          </div>
        )}

        {/* Плашки: доставка + ответственный + дата готовности */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {order.delivery_type && DELIVERY_TYPES[order.delivery_type] && (
            <span
              title={DELIVERY_LABELS[order.delivery_type]}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
            >
              {DELIVERY_TYPES[order.delivery_type]}
            </span>
          )}
          {respStyle && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: respStyle.bg, color: respStyle.text }}
            >
              {respStyle.name}
            </span>
          )}
          {order.due_date && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-primary border border-accent/30">
              до {fmtDateShort(order.due_date)}
            </span>
          )}
        </div>

        {/* Шапка */}
        <div className="text-[11px] text-primary/70 mb-1">
          #{order.order_number} {fmtDate(order.created_at)}
        </div>
        <div className="font-bold text-primary leading-tight break-words">
          {order.city} {order.customer_name}
        </div>
        <div className="font-bold text-primary">{fmtMoney(order.total)}</div>

        {/* Прогресс плетения и покраски (с Плетения и далее) */}
        {showProgress && (
          <div className="mt-2 space-y-1.5">
            <div>
              <div className="flex justify-between text-[10px] text-primary/70 mb-0.5">
                <span>Сплетено</span>
                <span className="font-semibold text-green-700">{wPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500/70 transition-all"
                  style={{ width: `${wPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-primary/70 mb-0.5">
                <span>Покрашено</span>
                <span className="font-semibold text-green-700">{pPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500/70 transition-all"
                  style={{ width: `${pPct}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* НИЖНЯЯ часть — не окрашивается, раскрывается по клику */}
      {expanded && (
        <div
          className="bg-card border-t border-primary/20 p-3 space-y-3"
          onClick={e => e.stopPropagation()}
        >
          {/* На этапе Согласование: ответственный + дата готовности */}
          {isApproval && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-primary/60 block mb-1">Ответственный</label>
                <select
                  value={order.responsible || ''}
                  onChange={e => onUpdate(order.id, { responsible: e.target.value })}
                  className="w-full text-xs border border-primary/30 rounded-md px-2 py-1 bg-background outline-none focus:border-accent"
                >
                  <option value="">— не выбран —</option>
                  {RESPONSIBLES.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-primary/60 block mb-1">Дата готовности</label>
                <input
                  type="date"
                  value={order.due_date || ''}
                  onChange={e => onUpdate(order.id, { due_date: e.target.value })}
                  className="w-full text-xs border border-primary/30 rounded-md px-2 py-1 bg-background outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          {/* На этапе Плетение: дедлайн плетения и покраски */}
          {isWeaving && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-primary/60 block mb-1">Срок плетения</label>
                <input
                  type="date"
                  value={order.due_weaving || ''}
                  onChange={e => onUpdate(order.id, { due_weaving: e.target.value })}
                  className="w-full text-xs border border-primary/30 rounded-md px-2 py-1 bg-background outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-primary/60 block mb-1">Срок покраски</label>
                <input
                  type="date"
                  value={order.due_painting || ''}
                  onChange={e => onUpdate(order.id, { due_painting: e.target.value })}
                  className="w-full text-xs border border-primary/30 rounded-md px-2 py-1 bg-background outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          {/* Позиции (раскрытие цветов) */}
          {positions.length > 0 && (
            <div>
              <button
                onClick={() => setShowColors(v => !v)}
                className="text-[11px] text-primary/70 hover:text-primary mb-2"
              >
                {showColors ? 'скрыть цвета' : 'открыть цвета'}
              </button>
              <div className="border border-primary/30 rounded-md overflow-hidden">
                {positions.map(pos => (
                  <div key={pos.key}>
                    <div className="flex justify-between items-center gap-2 px-2 py-1 bg-primary/5 border-b border-primary/20">
                      <span className="font-bold text-primary text-xs break-words">{pos.title}</span>
                      <span className="font-bold text-primary text-xs flex-shrink-0">{pos.total}</span>
                    </div>
                    {showColors && pos.colors.map((c, i) => (
                      <div key={i} className="flex justify-between items-center gap-2 px-2 py-1 border-b border-primary/10 last:border-0">
                        <span className="text-primary/80 text-[11px] break-words">{c.color}</span>
                        <span className="text-primary/80 text-[11px] flex-shrink-0">{c.qty}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Кнопки архивирования/восстановления/удаления */}
          <div className="flex gap-2 pt-1 border-t border-primary/10">
            {isClosed ? (
              <button
                onClick={() => onUpdate(order.id, { stage: 'Новый заказ', is_archived: false })}
                className="text-[11px] text-primary/70 hover:text-primary underline"
              >
                Вернуть в работу
              </button>
            ) : order.is_trashed ? (
              <button
                onClick={() => onUpdate(order.id, { is_trashed: false })}
                className="text-[11px] text-primary/70 hover:text-primary underline"
              >
                Восстановить
              </button>
            ) : (
              <>
                <button
                  onClick={() => onUpdate(order.id, { stage: CLOSED_STAGE, is_archived: true })}
                  className="text-[11px] text-primary/70 hover:text-primary underline"
                >
                  В архив
                </button>
                <button
                  onClick={() => onUpdate(order.id, { is_trashed: true })}
                  className="text-[11px] text-red-400 hover:text-red-600 underline"
                >
                  Удалить
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Колонка архива (раскрывается/скрывается)
const ArchiveColumn = ({ orders, onDragStart, onUpdate }: {
  orders: Order[];
  onDragStart: (id: number) => void;
  onUpdate: (id: number, patch: Partial<Order>) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-64 flex-shrink-0 px-2 border-l border-primary/30">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-center font-semibold text-primary text-sm pb-3 mb-3 border-b border-primary/30 flex items-center justify-center gap-1"
      >
        Закрытые {orders.length > 0 && <span className="text-xs bg-primary/10 rounded-full px-1.5">{orders.length}</span>}
        <span className="text-primary/50 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="space-y-3 min-h-[40px]">
          {orders.length === 0
            ? <p className="text-xs text-muted-foreground text-center">Нет закрытых заказов</p>
            : orders.map(order => (
              <OrderCard key={order.id} order={order} onDragStart={onDragStart} onUpdate={onUpdate} />
            ))
          }
        </div>
      )}
    </div>
  );
};

// Колонка удалённых
const TrashColumn = ({ orders, onDragStart, onUpdate }: {
  orders: Order[];
  onDragStart: (id: number) => void;
  onUpdate: (id: number, patch: Partial<Order>) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-64 flex-shrink-0 px-2 border-l border-primary/30">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-center font-semibold text-red-400 text-sm pb-3 mb-3 border-b border-red-300/30 flex items-center justify-center gap-1"
      >
        Удалённые {orders.length > 0 && <span className="text-xs bg-red-400/10 rounded-full px-1.5">{orders.length}</span>}
        <span className="text-red-300 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="space-y-3 min-h-[40px]">
          {orders.length === 0
            ? <p className="text-xs text-muted-foreground text-center">Нет удалённых заказов</p>
            : orders.map(order => (
              <OrderCard key={order.id} order={order} onDragStart={onDragStart} onUpdate={onUpdate} />
            ))
          }
        </div>
      )}
    </div>
  );
};

// Основной компонент
const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<number | null>(null);

  const load = async () => {
    const res = await fetch(urls['orders']);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patchOrder = async (id: number, patch: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
    await fetch(urls['orders'], {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
  };

  const handleDrop = (stage: string) => {
    if (dragId !== null) {
      const isArchive = stage === CLOSED_STAGE;
      patchOrder(dragId, { stage, is_archived: isArchive });
      setDragId(null);
    }
  };

  // Рабочие этапы (без "Закрытые")
  const workStages = STAGES.filter(s => s !== CLOSED_STAGE);
  // Активные заказы (не в архиве, не удалены)
  const activeOrders = orders.filter(o => !o.is_archived && !o.is_trashed);
  // Закрытые
  const archivedOrders = orders.filter(o => o.is_archived && !o.is_trashed);
  // Удалённые
  const trashedOrders = orders.filter(o => o.is_trashed);

  return (
    <div className="p-6">
      <h1 className="font-display text-2xl font-semibold text-primary mb-6">Заказы</h1>

      {loading ? (
        <p className="text-muted-foreground">Загружаю...</p>
      ) : (
        <div className="flex gap-0 min-w-max">
          {/* Рабочие колонки */}
          {workStages.map((stage, idx) => {
            const stageOrders = activeOrders.filter(o => o.stage === stage);
            return (
              <div
                key={stage}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(stage)}
                className={`w-64 flex-shrink-0 px-2 ${idx > 0 ? 'border-l border-primary/30' : ''}`}
              >
                <h2 className="text-center font-semibold text-primary text-sm pb-3 mb-3 border-b border-primary/30">
                  {stage}
                </h2>
                <div className="space-y-3 min-h-[200px]">
                  {stageOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onDragStart={setDragId}
                      onUpdate={patchOrder}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Архив */}
          <ArchiveColumn
            orders={archivedOrders}
            onDragStart={setDragId}
            onUpdate={patchOrder}
          />

          {/* Удалённые */}
          <TrashColumn
            orders={trashedOrders}
            onDragStart={setDragId}
            onUpdate={patchOrder}
          />
        </div>
      )}

      {!loading && orders.length === 0 && (
        <p className="text-muted-foreground mt-4">
          Заказов пока нет. Они появятся здесь автоматически после оформления на сайте.
        </p>
      )}
    </div>
  );
};

export default AdminOrders;

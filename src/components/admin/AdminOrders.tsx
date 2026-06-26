import { useState, useEffect } from 'react';
import urls from '../../../backend/func2url.json';
import {
  STAGES, Order, groupPositions, fmtDate, fmtMoney,
  RESPONSIBLES, responsibleStyle, DELIVERY_TYPES, DELIVERY_LABELS,
  isBurning, fmtDueDate,
} from './orderUtils';

const OrderCard = ({ order, onDragStart, onUpdate }: {
  order: Order;
  onDragStart: (id: number) => void;
  onUpdate: (id: number, patch: Partial<Order>) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const positions = groupPositions(order.items);
  const burning = isBurning(order);
  const isApproval = order.stage === 'Согласование';
  const respStyle = responsibleStyle(order.responsible);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(order.id)}
      onClick={() => setExpanded(v => !v)}
      className={[
        'border rounded-2xl p-3 cursor-pointer transition-colors select-none',
        burning
          ? 'bg-red-500/15 border-red-400/60 hover:border-red-500'
          : 'bg-card border-primary/40 hover:border-primary',
      ].join(' ')}
    >
      {/* Плашка "горим по срокам" */}
      {burning && (
        <div className="mb-2 -mx-1 -mt-1">
          <span className="block text-center text-[11px] font-bold text-white bg-red-500 rounded-md py-1 px-2 animate-pulse">
            🔥 ГОРИМ ПО СРОКАМ!
          </span>
        </div>
      )}

      {/* Верхний ряд плашек: доставка + ответственный */}
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
            до {fmtDueDate(order.due_date)}
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

      {/* Управление на этапе "Согласование": ответственный + дата */}
      {isApproval && (
        <div className="mt-3 pt-2 border-t border-primary/20 space-y-2" onClick={e => e.stopPropagation()}>
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

      {/* Раскрытие позиций */}
      {expanded && positions.length > 0 && (
        <div className="mt-3 pt-2 border-t border-primary/20" onClick={e => e.stopPropagation()}>
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
    </div>
  );
};

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
      patchOrder(dragId, { stage });
      setDragId(null);
    }
  };

  return (
    <div className="p-6">
      <h1 className="font-display text-2xl font-semibold text-primary mb-6">Заказы</h1>

      {loading ? (
        <p className="text-muted-foreground">Загружаю...</p>
      ) : (
        <div className="flex gap-0 min-w-max">
          {STAGES.map((stage, idx) => {
            const stageOrders = orders.filter(o => o.stage === stage);
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

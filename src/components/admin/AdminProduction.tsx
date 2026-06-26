import { useState, useEffect } from 'react';
import urls from '../../../backend/func2url.json';
import { Order, groupPositions, fmtDate, fmtMoney, STAGES } from './orderUtils';

// В производство попадают заказы с этапа "Плетение" и позже
const PROD_STAGES = STAGES.slice(STAGES.indexOf('Плетение'));

function pct(done: number, qty: number): number {
  if (qty <= 0) return 0;
  return Math.round((done / qty) * 100);
}

const ProductionCard = ({ order, onUpdate }: {
  order: Order;
  onUpdate: (id: number, produced: Record<string, number>) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const positions = groupPositions(order.items);
  const produced = order.produced || {};

  // Итоги
  const totalQty = positions.reduce((s, p) => s + p.total, 0);
  const totalDone = positions.reduce((s, p) => s + Math.min(produced[p.key] || 0, p.total), 0);
  const totalLeft = totalQty - totalDone;
  const totalPct = pct(totalDone, totalQty);

  const setDone = (key: string, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(val, max));
    onUpdate(order.id, { ...produced, [key]: clamped });
  };

  return (
    <div
      onClick={() => setExpanded(v => !v)}
      className="bg-card border border-primary/40 rounded-2xl p-4 cursor-pointer hover:border-primary transition-colors"
    >
      {/* Свёрнутый вид: клиент + ИТОГО */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-[11px] text-primary/70 mb-1">
            #{order.order_number} {fmtDate(order.created_at)}
          </div>
          <div className="font-bold text-primary leading-tight">
            {order.city} {order.customer_name}
          </div>
          <div className="font-bold text-primary">{fmtMoney(order.total)}</div>
        </div>

        {/* Мини-таблица ИТОГО (всегда видна) */}
        <div className="border border-primary/30 rounded-md overflow-hidden text-xs min-w-[280px]" onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-4 bg-primary/5 border-b border-primary/20 text-center font-semibold text-primary">
            <div className="px-2 py-1">Кол-во</div>
            <div className="px-2 py-1 border-l border-primary/20">Сделано</div>
            <div className="px-2 py-1 border-l border-primary/20">Остаток</div>
            <div className="px-2 py-1 border-l border-primary/20">%</div>
          </div>
          <div className="grid grid-cols-4 text-center font-bold text-primary">
            <div className="px-2 py-1">{totalQty}</div>
            <div className="px-2 py-1 border-l border-primary/20">{totalDone}</div>
            <div className="px-2 py-1 border-l border-primary/20">{totalLeft}</div>
            <div className="px-2 py-1 border-l border-primary/20">{totalPct}%</div>
          </div>
        </div>
      </div>

      {/* Раскрытый вид: таблица по позициям */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-primary/20" onClick={e => e.stopPropagation()}>
          <div className="border border-primary/30 rounded-md overflow-hidden text-xs">
            {/* Заголовок */}
            <div className="grid grid-cols-[28px_1fr_70px_80px_70px_70px] bg-primary/5 border-b border-primary/20 font-semibold text-primary">
              <div className="px-2 py-1.5 text-center">№</div>
              <div className="px-2 py-1.5 border-l border-primary/20">Позиция</div>
              <div className="px-2 py-1.5 border-l border-primary/20 text-center">Кол-во</div>
              <div className="px-2 py-1.5 border-l border-primary/20 text-center">Сделано</div>
              <div className="px-2 py-1.5 border-l border-primary/20 text-center">Остаток</div>
              <div className="px-2 py-1.5 border-l border-primary/20 text-center">%</div>
            </div>
            {/* Строки */}
            {positions.map((pos, i) => {
              const done = Math.min(produced[pos.key] || 0, pos.total);
              const left = pos.total - done;
              return (
                <div key={pos.key} className="grid grid-cols-[28px_1fr_70px_80px_70px_70px] border-b border-primary/10 last:border-0 items-center">
                  <div className="px-2 py-1.5 text-center text-primary font-semibold">{i + 1}</div>
                  <div className="px-2 py-1.5 border-l border-primary/10 text-primary font-medium break-words">{pos.title}</div>
                  <div className="px-2 py-1.5 border-l border-primary/10 text-center text-primary font-bold">{pos.total}</div>
                  <div className="px-1 py-1 border-l border-primary/10 text-center">
                    <input
                      type="number"
                      min={0}
                      max={pos.total}
                      value={done}
                      onChange={e => setDone(pos.key, parseInt(e.target.value, 10) || 0, pos.total)}
                      className="w-14 text-center border border-primary/30 rounded px-1 py-0.5 bg-background outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="px-2 py-1.5 border-l border-primary/10 text-center text-primary font-bold">{left}</div>
                  <div className="px-2 py-1.5 border-l border-primary/10 text-center text-primary">{pct(done, pos.total)}%</div>
                </div>
              );
            })}
            {/* ИТОГО */}
            <div className="grid grid-cols-[28px_1fr_70px_80px_70px_70px] bg-primary/5 border-t-2 border-primary/30 items-center font-bold text-primary">
              <div className="px-2 py-1.5"></div>
              <div className="px-2 py-1.5 border-l border-primary/20 text-center">ИТОГО</div>
              <div className="px-2 py-1.5 border-l border-primary/20 text-center">{totalQty}</div>
              <div className="px-2 py-1.5 border-l border-primary/20 text-center">{totalDone}</div>
              <div className="px-2 py-1.5 border-l border-primary/20 text-center">{totalLeft}</div>
              <div className="px-2 py-1.5 border-l border-primary/20 text-center">{totalPct}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminProduction = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch(urls['orders']);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateProduced = async (id: number, produced: Record<string, number>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, produced } : o));
    await fetch(urls['orders'], {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, produced }),
    });
  };

  const prodOrders = orders.filter(o => PROD_STAGES.includes(o.stage));

  return (
    <div className="p-6">
      <h1 className="font-display text-2xl font-semibold text-primary mb-6">Производство</h1>

      {loading ? (
        <p className="text-muted-foreground">Загружаю...</p>
      ) : prodOrders.length === 0 ? (
        <p className="text-muted-foreground">
          Заказов в производстве пока нет. Они появятся здесь автоматически, когда заказ перейдёт на этап «Плетение».
        </p>
      ) : (
        <div className="space-y-5 max-w-4xl">
          {prodOrders.map(order => (
            <ProductionCard key={order.id} order={order} onUpdate={updateProduced} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProduction;

import { useState, useEffect } from 'react';
import urls from '../../../backend/func2url.json';
import { Order, groupPositions, fmtDate, fmtMoney, fmtDateShort, STAGES, CLOSED_STAGE } from './orderUtils';

const PROD_STAGES = STAGES.slice(STAGES.indexOf('Плетение'));
const OLIVE = '#6b7c3a';

function pct(done: number, qty: number): number {
  if (qty <= 0) return 0;
  return Math.round((done / qty) * 100);
}

function nextStage(current: string): string | null {
  const work = STAGES.filter(s => s !== CLOSED_STAGE);
  const idx = work.indexOf(current);
  if (idx === -1 || idx >= work.length - 1) return null;
  return work[idx + 1];
}

const ProductionCard = ({ order, onUpdateProduced, onUpdateStage }: {
  order: Order;
  onUpdateProduced: (id: number, produced: Record<string, number>) => void;
  onUpdateStage: (id: number, stage: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const positions = groupPositions(order.items);
  const produced = order.produced || {};

  const totalQty  = positions.reduce((s, p) => s + p.total, 0);
  const totalDone = positions.reduce((s, p) => s + Math.min(produced[p.key] || 0, p.total), 0);
  const totalLeft = totalQty - totalDone;
  const totalPct  = pct(totalDone, totalQty);

  const setDone = (key: string, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(val, max));
    onUpdateProduced(order.id, { ...produced, [key]: clamped });
  };

  return (
    <div
      onClick={() => setExpanded(v => !v)}
      className="bg-card border border-primary/40 rounded-2xl overflow-hidden cursor-pointer hover:border-primary transition-colors"
    >
      {/* Шапка карточки */}
      <div className="p-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <div className="text-[11px] text-primary/70 mb-1">
              #{order.order_number} {fmtDate(order.created_at)}
            </div>
            <div className="font-bold text-primary leading-tight">{order.city} {order.customer_name}</div>
            <div className="font-bold text-primary mb-1">{fmtMoney(order.total)}</div>
            {/* Даты */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              {order.due_date && (
                <span className="px-2 py-0.5 rounded-full bg-accent/15 text-primary border border-accent/30">
                  Готовность: {fmtDateShort(order.due_date)}
                </span>
              )}
              {order.due_weaving && (
                <span className="px-2 py-0.5 rounded-full bg-primary/8 text-primary/80 border border-primary/20">
                  Плетение до: {fmtDateShort(order.due_weaving)}
                </span>
              )}
            </div>
          </div>

          {/* ИТОГО */}
          <div className="border-t border-primary/20 md:border-t-0 md:border-l md:border-primary/20 pt-3 md:pt-0 md:pl-4 min-w-[220px]" onClick={e => e.stopPropagation()}>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-primary/5">
                  <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20">Кол-во</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20">Сделано</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20">Остаток</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20">%</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{totalQty}</td>
                  <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{totalDone}</td>
                  <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{totalLeft}</td>
                  <td className="px-2 py-1.5 text-center font-bold border border-primary/20" style={{color: OLIVE}}>{totalPct}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Развёрнутая таблица */}
      {expanded && (
        <div className="border-t border-primary/20" onClick={e => e.stopPropagation()}>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-primary/5">
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-8">№</th>
                <th className="px-3 py-1.5 text-left font-semibold text-primary border border-primary/20">Позиция</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-16">Кол-во</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-20">Сделано</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-16">Остаток</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-14">%</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => {
                const done = Math.min(produced[pos.key] || 0, pos.total);
                const left = pos.total - done;
                return (
                  <tr key={pos.key}>
                    <td className="px-2 py-1.5 text-center text-primary font-semibold border border-primary/10">{i + 1}</td>
                    <td className="px-3 py-1.5 text-primary border border-primary/10 break-words">{pos.title}</td>
                    <td className="px-2 py-1.5 text-center text-primary font-bold border border-primary/10">{pos.total}</td>
                    <td className="px-1 py-1 text-center border border-primary/10">
                      <input
                        type="number" min={0} max={pos.total}
                        defaultValue={done}
                        key={`${pos.key}-${done}`}
                        onBlur={e => setDone(pos.key, parseInt(e.target.value, 10) || 0, pos.total)}
                        onKeyDown={e => e.key === 'Enter' && setDone(pos.key, parseInt((e.target as HTMLInputElement).value, 10) || 0, pos.total)}
                        className="w-14 text-center border border-primary/30 rounded px-1 py-0.5 bg-background outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center text-primary font-bold border border-primary/10">{left}</td>
                    <td className="px-2 py-1.5 text-center font-semibold border border-primary/10" style={{color: OLIVE}}>{pct(done, pos.total)}%</td>
                  </tr>
                );
              })}
              {/* ИТОГО */}
              <tr className="bg-primary/5 border-t-2 border-primary/30">
                <td className="border border-primary/20"></td>
                <td className="px-3 py-1.5 text-center font-bold text-primary border border-primary/20">ИТОГО</td>
                <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{totalQty}</td>
                <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{totalDone}</td>
                <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{totalLeft}</td>
                <td className="px-2 py-1.5 text-center font-bold border border-primary/20" style={{color: OLIVE}}>{totalPct}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Кнопка следующей стадии */}
      {(() => {
        const next = nextStage(order.stage);
        return next ? (
          <div className="px-4 pb-4" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onUpdateStage(order.id, next)}
              className="w-full text-xs font-semibold py-2 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground transition-colors"
            >
              → {next}
            </button>
          </div>
        ) : null;
      })()}
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

  const updateStage = async (id: number, stage: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, stage } : o));
    await fetch(urls['orders'], {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, stage }),
    });
  };

  const prodOrders = orders.filter(o =>
    PROD_STAGES.includes(o.stage) && !o.is_archived && !o.is_trashed
  );

  return (
    <div className="p-6">
      <h1 className="font-display text-2xl font-semibold text-primary mb-6">Производство</h1>
      {loading ? (
        <p className="text-muted-foreground">Загружаю...</p>
      ) : prodOrders.length === 0 ? (
        <p className="text-muted-foreground">
          Заказов в производстве пока нет — они появятся при переходе на этап «Плетение».
        </p>
      ) : (
        <div className="space-y-5 max-w-4xl">
          {prodOrders.map(order => (
            <ProductionCard key={order.id} order={order} onUpdateProduced={updateProduced} onUpdateStage={updateStage} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProduction;
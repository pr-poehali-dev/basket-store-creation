import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';

const STAGES = ['Новый заказ', 'Согласование', 'Оплата', 'Плетение',
  'Малярка', 'Упаковка', 'Доставка', 'Отправили'];

interface OrderItem {
  name: string;
  size: string;
  color: string;
  qty: number;
}

interface Order {
  id: number;
  order_number: string;
  stage: string;
  city: string;
  customer_name: string;
  total: number;
  items: OrderItem[];
  created_at: string | null;
}

// Группировка позиций: позиция = название + размер (цвета — варианты внутри)
interface Position {
  key: string;
  title: string;
  total: number;
  colors: { color: string; qty: number }[];
}

function groupPositions(items: OrderItem[]): Position[] {
  const map = new Map<string, Position>();
  for (const it of items) {
    const key = `${it.name}__${it.size}`;
    const title = it.size ? `${it.name} (${it.size})` : it.name;
    if (!map.has(key)) {
      map.set(key, { key, title, total: 0, colors: [] });
    }
    const pos = map.get(key)!;
    pos.total += it.qty;
    const existing = pos.colors.find(c => c.color === it.color);
    if (existing) existing.qty += it.qty;
    else pos.colors.push({ color: it.color || '—', qty: it.qty });
  }
  return Array.from(map.values());
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtMoney(n: number): string {
  return n.toLocaleString('ru-RU') + ' руб';
}

const OrderCard = ({ order, onDragStart }: {
  order: Order;
  onDragStart: (id: number) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const positions = groupPositions(order.items);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(order.id)}
      onClick={() => setExpanded(v => !v)}
      className="bg-card border border-primary/40 rounded-2xl p-3 cursor-pointer hover:border-primary transition-colors select-none"
    >
      <div className="text-[11px] text-primary/70 mb-1">
        #{order.order_number} {fmtDate(order.created_at)}
      </div>
      <div className="font-bold text-primary leading-tight">
        {order.city} {order.customer_name}
      </div>
      <div className="font-bold text-primary">{fmtMoney(order.total)}</div>

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
                <div className="flex justify-between items-center px-2 py-1 bg-primary/5 border-b border-primary/20">
                  <span className="font-bold text-primary text-xs">{pos.title}</span>
                  <span className="font-bold text-primary text-xs">{pos.total}</span>
                </div>
                {showColors && pos.colors.map((c, i) => (
                  <div key={i} className="flex justify-between items-center px-2 py-1 border-b border-primary/10 last:border-0">
                    <span className="text-primary/80 text-[11px]">{c.color}</span>
                    <span className="text-primary/80 text-[11px]">{c.qty}</span>
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

  const moveToStage = async (id: number, stage: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, stage } : o));
    await fetch(urls['orders'], {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, stage }),
    });
  };

  const handleDrop = (stage: string) => {
    if (dragId !== null) {
      moveToStage(dragId, stage);
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
                className={`w-48 flex-shrink-0 px-2 ${idx > 0 ? 'border-l border-primary/30' : ''}`}
              >
                <h2 className="text-center font-semibold text-primary text-sm pb-3 mb-3 border-b border-primary/30">
                  {stage}
                </h2>
                <div className="space-y-3 min-h-[200px]">
                  {stageOrders.map(order => (
                    <OrderCard key={order.id} order={order} onDragStart={setDragId} />
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

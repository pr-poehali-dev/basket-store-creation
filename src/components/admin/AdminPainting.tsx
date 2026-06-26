import { useState, useEffect } from 'react';
import urls from '../../../backend/func2url.json';
import { Order, OrderItem, fmtDate, fmtMoney, STAGES } from './orderUtils';

// Цвета из каталога (без натурального)
const PAINT_COLORS: { name: string; hex: string }[] = [
  { name: 'белый',      hex: '#F5F5F0' },
  { name: 'капучино',   hex: '#C4A882' },
  { name: 'молочный',   hex: '#EDE8DE' },
  { name: 'оливковый',  hex: '#8A9A6A' },
  { name: 'персиковый', hex: '#FFCBA4' },
  { name: 'розовый',    hex: '#F4A7B9' },
  { name: 'серый',      hex: '#A8A8A8' },
  { name: 'фиолетовый', hex: '#9B7EC8' },
  { name: 'шоколадный', hex: '#6B3E26' },
];

const PAINTING_STAGES = STAGES.slice(STAGES.indexOf('Плетение'));
const ONLY_PAINTING_STAGE = ['Малярка'];

function pct(done: number, qty: number): number {
  if (qty <= 0) return 0;
  return Math.round((done / qty) * 100);
}

// Группируем items по цвету (без натурального), объединяя позиции одного цвета
function groupByColor(items: OrderItem[]): Map<string, { posKey: string; posTitle: string; qty: number }[]> {
  const map = new Map<string, { posKey: string; posTitle: string; qty: number }[]>();
  for (const it of items) {
    const color = (it.color || '').toLowerCase().trim();
    if (color === 'натуральный' || color === '') continue;
    const posKey = `${it.name}__${it.size}`;
    const posTitle = it.size ? `${it.name} (${it.size})` : it.name;
    if (!map.has(color)) map.set(color, []);
    const arr = map.get(color)!;
    const existing = arr.find(p => p.posKey === posKey);
    if (existing) existing.qty += it.qty;
    else arr.push({ posKey, posTitle, qty: it.qty });
  }
  return map;
}

const PaintingCard = ({ order, colorFilter, onUpdatePainted }: {
  order: Order;
  colorFilter: string | null;
  onUpdatePainted: (id: number, painted: Record<string, number>) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const byColor = groupByColor(order.items);
  const painted = order.painted || {};
  const produced = order.produced || {};

  // Если есть фильтр по цвету — показываем только его
  const colorsToShow = colorFilter
    ? (byColor.has(colorFilter) ? [[colorFilter, byColor.get(colorFilter)!] as [string, typeof byColor extends Map<string, infer V> ? V : never]] : [])
    : Array.from(byColor.entries());

  if (colorsToShow.length === 0) return null;

  // Сводный итог по видимым цветам
  let sumQty = 0, sumPainted = 0;
  for (const [, positions] of colorsToShow) {
    for (const pos of positions) {
      sumQty += pos.qty;
      const pKey = pos.posKey;
      sumPainted += Math.min(painted[pKey] || 0, pos.qty);
    }
  }
  const totalPct = pct(sumPainted, sumQty);

  const setPainted = (posKey: string, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(val, max));
    onUpdatePainted(order.id, { ...painted, [posKey]: clamped });
  };

  return (
    <div
      onClick={() => setExpanded(v => !v)}
      className="bg-card border border-primary/40 rounded-2xl p-4 cursor-pointer hover:border-primary transition-colors"
    >
      {/* Шапка */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-[11px] text-primary/70 mb-1">
            #{order.order_number} {fmtDate(order.created_at)}
          </div>
          <div className="font-bold text-primary leading-tight">{order.city} {order.customer_name}</div>
          <div className="font-bold text-primary">{fmtMoney(order.total)}</div>
          {/* Цветовые плашки заказа */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Array.from(byColor.keys()).map(color => {
              const colorDef = PAINT_COLORS.find(c => c.name === color);
              return (
                <span
                  key={color}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-primary/20 font-medium"
                  style={colorDef ? { backgroundColor: colorDef.hex, color: '#3a2a1a' } : { backgroundColor: '#eee', color: '#555' }}
                >
                  {color.slice(0, 3)}
                </span>
              );
            })}
          </div>
        </div>

        {/* ИТОГО */}
        <div className="border border-primary/30 rounded-md overflow-hidden text-xs min-w-[280px]" onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-4 bg-primary/5 border-b border-primary/20 text-center font-semibold text-primary">
            <div className="px-2 py-1">Кол-во</div>
            <div className="px-2 py-1 border-l border-primary/20">Покрашено</div>
            <div className="px-2 py-1 border-l border-primary/20">Остаток</div>
            <div className="px-2 py-1 border-l border-primary/20">%</div>
          </div>
          <div className="grid grid-cols-4 text-center font-bold text-primary">
            <div className="px-2 py-1">{sumQty}</div>
            <div className="px-2 py-1 border-l border-primary/20">{sumPainted}</div>
            <div className="px-2 py-1 border-l border-primary/20">{sumQty - sumPainted}</div>
            <div className="px-2 py-1 border-l border-primary/20 text-green-700">{totalPct}%</div>
          </div>
        </div>
      </div>

      {/* Развёрнутый вид: группы по цветам */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-primary/20 space-y-4" onClick={e => e.stopPropagation()}>
          {colorsToShow.map(([color, positions]) => {
            const colorDef = PAINT_COLORS.find(c => c.name === color);
            let colorQty = 0, colorPainted = 0;
            for (const pos of positions) {
              colorQty += pos.qty;
              colorPainted += Math.min(painted[pos.posKey] || 0, pos.qty);
            }
            return (
              <div key={color}>
                {/* Заголовок цвета */}
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-lg mb-2 font-bold text-sm"
                  style={colorDef ? { backgroundColor: colorDef.hex, color: '#3a2a1a' } : { backgroundColor: '#eee', color: '#333' }}
                >
                  <span className="uppercase tracking-wide">{color}</span>
                </div>

                <div className="border border-primary/30 rounded-md overflow-hidden text-xs">
                  {/* Заголовок таблицы */}
                  <div className="grid grid-cols-[28px_1fr_70px_80px_80px_70px_70px] bg-primary/5 border-b border-primary/20 font-semibold text-primary">
                    <div className="px-2 py-1.5 text-center">№</div>
                    <div className="px-2 py-1.5 border-l border-primary/20">Позиция</div>
                    <div className="px-2 py-1.5 border-l border-primary/20 text-center">Кол-во</div>
                    <div className="px-2 py-1.5 border-l border-primary/20 text-center">Сплетено</div>
                    <div className="px-2 py-1.5 border-l border-primary/20 text-center">Покрашено</div>
                    <div className="px-2 py-1.5 border-l border-primary/20 text-center">Остаток</div>
                    <div className="px-2 py-1.5 border-l border-primary/20 text-center">%</div>
                  </div>
                  {/* Строки */}
                  {positions.map((pos, i) => {
                    const woven = produced[pos.posKey] || 0;
                    const paintedVal = Math.min(painted[pos.posKey] || 0, pos.qty);
                    const left = pos.qty - paintedVal;
                    return (
                      <div key={pos.posKey} className="grid grid-cols-[28px_1fr_70px_80px_80px_70px_70px] border-b border-primary/10 last:border-0 items-center">
                        <div className="px-2 py-1.5 text-center text-primary font-semibold">{i + 1}</div>
                        <div className="px-2 py-1.5 border-l border-primary/10 text-primary font-medium break-words">{pos.posTitle}</div>
                        <div className="px-2 py-1.5 border-l border-primary/10 text-center text-primary font-bold">{pos.qty}</div>
                        <div className="px-2 py-1.5 border-l border-primary/10 text-center text-primary/70">{woven}</div>
                        <div className="px-1 py-1 border-l border-primary/10 text-center">
                          <input
                            type="number"
                            min={0}
                            max={pos.qty}
                            value={paintedVal}
                            onChange={e => setPainted(pos.posKey, parseInt(e.target.value, 10) || 0, pos.qty)}
                            className="w-14 text-center border border-primary/30 rounded px-1 py-0.5 bg-background outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <div className="px-2 py-1.5 border-l border-primary/10 text-center text-primary font-bold">{left}</div>
                        <div className="px-2 py-1.5 border-l border-primary/10 text-center text-primary">{pct(paintedVal, pos.qty)}%</div>
                      </div>
                    );
                  })}
                  {/* ИТОГО по цвету */}
                  <div className="grid grid-cols-[28px_1fr_70px_80px_80px_70px_70px] bg-primary/5 border-t-2 border-primary/30 items-center font-bold text-primary">
                    <div className="px-2 py-1.5"></div>
                    <div className="px-2 py-1.5 border-l border-primary/20 text-center">ИТОГО</div>
                    <div className="px-2 py-1.5 border-l border-primary/20 text-center">{colorQty}</div>
                    <div className="px-2 py-1.5 border-l border-primary/20 text-center text-primary/50">—</div>
                    <div className="px-2 py-1.5 border-l border-primary/20 text-center">{colorPainted}</div>
                    <div className="px-2 py-1.5 border-l border-primary/20 text-center">{colorQty - colorPainted}</div>
                    <div className="px-2 py-1.5 border-l border-primary/20 text-center text-green-700">{pct(colorPainted, colorQty)}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AdminPainting = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMode, setShowMode] = useState<'all' | 'ready'>('all');
  const [colorFilter, setColorFilter] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch(urls['orders']);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updatePainted = async (id: number, painted: Record<string, number>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, painted } : o));
    await fetch(urls['orders'], {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, painted }),
    });
  };

  // Все заказы: в Плетении и Малярке (не архив, не удалён)
  const allOrders = orders.filter(o =>
    PAINTING_STAGES.includes(o.stage) && !o.is_archived && !o.is_trashed
  );

  // Только 100% сплетённые (в Малярке)
  const readyOrders = orders.filter(o =>
    ONLY_PAINTING_STAGE.includes(o.stage) && !o.is_archived && !o.is_trashed
  );

  const visibleOrders = showMode === 'all' ? allOrders : readyOrders;

  return (
    <div className="p-6">
      {/* Заголовок + кнопки режима */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <h1 className="font-display text-2xl font-semibold text-primary">Заказы в работе</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMode('all')}
            className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
              showMode === 'all'
                ? 'bg-primary text-white border-primary'
                : 'border-primary/40 text-primary hover:border-primary'
            }`}
          >
            Все заказы
          </button>
          <button
            onClick={() => setShowMode('ready')}
            className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
              showMode === 'ready'
                ? 'bg-primary text-white border-primary'
                : 'border-primary/40 text-primary hover:border-primary'
            }`}
          >
            Сплетены 100%
          </button>
        </div>
      </div>

      {/* Кнопки-цвета */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PAINT_COLORS.map(c => (
          <button
            key={c.name}
            onClick={() => setColorFilter(colorFilter === c.name ? null : c.name)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all ${
              colorFilter === c.name ? 'border-primary/70 shadow-md scale-105' : 'border-transparent'
            }`}
            style={{ backgroundColor: c.hex, color: '#3a2a1a' }}
          >
            {c.name.slice(0, 6)}
          </button>
        ))}
        {colorFilter && (
          <button
            onClick={() => setColorFilter(null)}
            className="px-3 py-1.5 rounded-xl text-sm text-muted-foreground border border-border hover:border-primary transition-colors"
          >
            Сбросить
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Загружаю...</p>
      ) : visibleOrders.length === 0 ? (
        <p className="text-muted-foreground">Нет подходящих заказов.</p>
      ) : (
        <div className="space-y-5 max-w-5xl">
          {visibleOrders.map(order => (
            <PaintingCard
              key={order.id}
              order={order}
              colorFilter={colorFilter}
              onUpdatePainted={updatePainted}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPainting;

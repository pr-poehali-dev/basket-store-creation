import { useState, useEffect, useMemo } from 'react';
import urls from '../../../backend/func2url.json';

interface OrderItem { name: string; size: string; color: string; qty: number; }

interface Product { id: number; name: string; size: string; price: number; cost: number; }

interface Order {
  id: number;
  order_number: string;
  stage: string;
  city: string;
  customer_name: string;
  phone: string;
  total: number;
  discount: number;
  items: OrderItem[];
  created_at: string;
  due_date: string;
  is_archived: boolean;
  is_trashed: boolean;
}

function fmtMoney(n: number) { return n.toLocaleString('ru-RU') + ' ₽'; }
function fmtDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtPct(pct: number) {
  if (pct >= 30) return 'text-green-600';
  if (pct >= 10) return 'text-yellow-600';
  return 'text-red-500';
}
function pctColor(pct: number) {
  if (pct >= 30) return '#16a34a';
  if (pct >= 10) return '#ca8a04';
  return '#ef4444';
}

// Вычисляем стоимость позиции из каталога
function getCost(item: OrderItem, products: Product[]): { price: number; cost: number } {
  const key  = item.size ? `${item.name}__${item.size}` : item.name;
  const prod = products.find(p => {
    const pk = p.size ? `${p.name}__${p.size}` : p.name;
    return pk.toLowerCase() === key.toLowerCase();
  });
  return { price: prod?.price || 0, cost: prod?.cost || 0 };
}

// Прибыль с заказа
function calcProfit(order: Order, products: Product[]): { revenue: number; cost: number; profit: number; pct: number } {
  const disc = 1 - (order.discount || 0) / 100;
  const revenue = order.total;
  let totalCost = 0;
  for (const item of order.items) {
    const { cost } = getCost(item, products);
    totalCost += cost * item.qty;
  }
  const profit = revenue - totalCost;
  const pct = revenue > 0 ? Math.round(profit / revenue * 100) : 0;
  return { revenue, cost: totalCost, profit, pct };
}

// Мини-диаграмма для клиента
const ClientStats = ({ orders, products, onClose }: { orders: Order[]; products: Product[]; onClose: () => void }) => {
  if (orders.length === 0) return null;

  const months: Record<string, { revenue: number; profit: number; count: number }> = {};
  const posFreq: Record<string, number> = {};
  const colorFreq: Record<string, number> = {};
  let totalDiscount = 0;

  for (const o of orders) {
    const ym = (o.created_at || '').slice(0, 7);
    if (!months[ym]) months[ym] = { revenue: 0, profit: 0, count: 0 };
    const { profit } = calcProfit(o, products);
    months[ym].revenue += o.total;
    months[ym].profit  += profit;
    months[ym].count   += 1;
    totalDiscount       += o.discount || 0;
    for (const item of o.items) {
      posFreq[item.name] = (posFreq[item.name] || 0) + item.qty;
      if (item.color) colorFreq[item.color] = (colorFreq[item.color] || 0) + item.qty;
    }
  }

  const monthList = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0]));
  const topPos    = Object.entries(posFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topColors = Object.entries(colorFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const avgDiscount = orders.length > 0 ? Math.round(totalDiscount / orders.length) : 0;
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalProfit  = orders.reduce((s, o) => s + calcProfit(o, products).profit, 0);
  const maxRevenue   = Math.max(...monthList.map(([,v]) => v.revenue), 1);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-primary/25 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold text-primary">Статистика клиента</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-primary text-xl">✕</button>
        </div>

        {/* Общая сводка */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            ['Заказов', orders.length],
            ['Выручка', fmtMoney(totalRevenue)],
            ['Чистая прибыль', fmtMoney(totalProfit)],
            ['Средняя скидка', avgDiscount + '%'],
          ].map(([label, val]) => (
            <div key={label as string} className="bg-card border border-primary/20 rounded-xl px-4 py-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xl font-bold text-primary">{val}</div>
            </div>
          ))}
        </div>

        {/* График по месяцам */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-primary mb-3">Выручка по месяцам</h3>
          <div className="flex gap-1 items-end h-24">
            {monthList.map(([ym, val]) => (
              <div key={ym} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-full rounded-t-sm bg-accent/60 transition-all"
                  style={{ height: `${Math.round(val.revenue / maxRevenue * 80)}px`, minHeight: 4 }}
                  title={`${ym}: ${fmtMoney(val.revenue)}`} />
                <span className="text-[9px] text-primary/50">{ym.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Топ позиций и цветов */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-primary mb-2">Частые позиции</h3>
            <div className="space-y-1.5">
              {topPos.map(([name, qty]) => (
                <div key={name} className="flex justify-between text-sm">
                  <span className="text-primary/80 truncate">{name}</span>
                  <span className="font-bold text-primary ml-2">{qty} шт</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary mb-2">Частые цвета</h3>
            <div className="space-y-1.5">
              {topColors.map(([color, qty]) => (
                <div key={color} className="flex justify-between text-sm">
                  <span className="text-primary/80 capitalize">{color}</span>
                  <span className="font-bold text-primary ml-2">{qty} шт</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminIncome = () => {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [statsClient, setStatsClient] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ordRes, prodRes] = await Promise.all([
          fetch(urls['orders']),
          fetch(`${urls['products']}?raw=1`),
        ]);
        const [ordData, prodData] = await Promise.all([ordRes.json(), prodRes.json()]);
        setOrders((ordData.orders || []).filter((o: Order) => !o.is_trashed && o.stage !== 'Новый заказ'));
        setProducts(prodData.products || []);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (search && !o.customer_name.toLowerCase().includes(search.toLowerCase()) && !o.city.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateFrom && (o.created_at || '') < dateFrom) return false;
      if (dateTo   && (o.created_at || '') > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [orders, search, dateFrom, dateTo]);

  // Общая статистика
  const totalRevenue = filtered.reduce((s, o) => s + o.total, 0);
  const totalProfit  = filtered.reduce((s, o) => s + calcProfit(o, products).profit, 0);
  const avgPct       = totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0;

  // Заказы клиента для статистики
  const clientOrders = statsClient ? filtered.filter(o => o.phone === statsClient || o.customer_name === statsClient) : [];

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="font-display text-2xl font-semibold text-primary mb-1">Поступления</h1>

      {/* Статистика */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="bg-card border border-primary/25 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Выручка</div>
          <div className="text-2xl font-bold text-primary">{fmtMoney(totalRevenue)}</div>
        </div>
        <div className="bg-card border border-green-200 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Чистая прибыль</div>
          <div className="text-2xl font-bold text-green-600">{fmtMoney(totalProfit)}</div>
        </div>
        <div className="bg-card border border-primary/25 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Средний %</div>
          <div className={`text-2xl font-bold ${fmtPct(avgPct)}`}>{avgPct}%</div>
        </div>
        <div className="bg-card border border-primary/25 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Заказов</div>
          <div className="text-2xl font-bold text-primary">{filtered.length}</div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по клиенту или городу..."
          className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent flex-1 min-w-[200px]" />
        <div className="flex items-center gap-2 text-sm text-primary/70">
          <span>С</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
          <span>По</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
        </div>
        {(search || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
            className="text-sm text-muted-foreground hover:text-primary underline">Сбросить</button>
        )}
      </div>

      {loading ? <p className="text-muted-foreground">Загружаю...</p> : (
        <div className="space-y-2">
          {filtered.map(order => {
            const { revenue, cost, profit, pct } = calcProfit(order, products);
            const isExpanded = expandedId === order.id;
            return (
              <div key={order.id} className="border border-primary/20 rounded-2xl overflow-hidden">
                {/* Строка заказа */}
                <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-primary/3 transition-colors gap-3 flex-wrap"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <button
                      className="text-xs px-2 py-0.5 rounded-lg border border-primary/25 text-primary/60 hover:text-primary hover:border-primary transition-colors flex-shrink-0"
                      onClick={e => { e.stopPropagation(); setStatsClient(order.phone || order.customer_name); }}>
                      📊
                    </button>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{fmtDate(order.created_at)}</span>
                    <span className="font-medium text-primary truncate">{order.city} {order.customer_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/8 text-primary flex-shrink-0">{order.stage}</span>
                    {order.discount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold flex-shrink-0">−{order.discount}%</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-primary">{fmtMoney(revenue)}</div>
                      <div className="text-xs text-muted-foreground">прибыль: <span className="font-semibold" style={{ color: pctColor(pct) }}>{fmtMoney(profit)} ({pct}%)</span></div>
                    </div>
                    <span className="text-primary/40 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Детали позиций */}
                {isExpanded && (
                  <div className="border-t border-primary/10 px-4 pb-3 pt-2 bg-primary/2">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-xs text-primary/50 border-b border-primary/10">
                          <th className="py-1.5 text-left font-semibold">Позиция</th>
                          <th className="py-1.5 text-left font-semibold">Цвет</th>
                          <th className="py-1.5 text-right font-semibold">Кол-во</th>
                          <th className="py-1.5 text-right font-semibold">Цена</th>
                          <th className="py-1.5 text-right font-semibold">Сумма</th>
                          <th className="py-1.5 text-right font-semibold">Затраты</th>
                          <th className="py-1.5 text-right font-semibold">Прибыль</th>
                          <th className="py-1.5 text-right font-semibold">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, i) => {
                          const { price, cost: itemCost } = getCost(item, products);
                          const disc = 1 - (order.discount || 0) / 100;
                          const itemRevenue = price * item.qty * disc;
                          const itemTotalCost = itemCost * item.qty;
                          const itemProfit = itemRevenue - itemTotalCost;
                          const itemPct = itemRevenue > 0 ? Math.round(itemProfit / itemRevenue * 100) : 0;
                          return (
                            <tr key={i} className="border-b border-primary/8 last:border-0">
                              <td className="py-1.5 text-primary font-medium">{item.name}{item.size ? ` (${item.size})` : ''}</td>
                              <td className="py-1.5 text-primary/70">{item.color || '—'}</td>
                              <td className="py-1.5 text-right text-primary">{item.qty}</td>
                              <td className="py-1.5 text-right text-primary/70">{price > 0 ? fmtMoney(price) : '—'}</td>
                              <td className="py-1.5 text-right font-bold text-primary">{itemRevenue > 0 ? fmtMoney(itemRevenue) : '—'}</td>
                              <td className="py-1.5 text-right text-primary/60">{itemTotalCost > 0 ? fmtMoney(itemTotalCost) : '—'}</td>
                              <td className="py-1.5 text-right font-semibold" style={{ color: itemProfit >= 0 ? pctColor(itemPct) : '#ef4444' }}>
                                {itemRevenue > 0 ? fmtMoney(itemProfit) : '—'}
                              </td>
                              <td className="py-1.5 text-right font-bold" style={{ color: pctColor(itemPct) }}>
                                {itemRevenue > 0 ? itemPct + '%' : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-primary/20 font-bold text-sm">
                          <td className="py-2 text-primary" colSpan={4}>ИТОГО</td>
                          <td className="py-2 text-right text-primary">{fmtMoney(revenue)}</td>
                          <td className="py-2 text-right text-primary/60">{fmtMoney(cost)}</td>
                          <td className="py-2 text-right" style={{ color: pctColor(pct) }}>{fmtMoney(profit)}</td>
                          <td className="py-2 text-right font-bold text-lg" style={{ color: pctColor(pct) }}>{pct}%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-muted-foreground">Нет заказов по выбранным фильтрам.</p>}
        </div>
      )}

      {/* Статистика клиента */}
      {statsClient && (
        <ClientStats
          orders={orders.filter(o => o.phone === statsClient || o.customer_name === statsClient)}
          products={products}
          onClose={() => setStatsClient(null)}
        />
      )}
    </div>
  );
};

export default AdminIncome;

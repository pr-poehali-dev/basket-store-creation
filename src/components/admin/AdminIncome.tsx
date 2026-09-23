import { useState, useEffect, useMemo, Fragment } from 'react';
import urls from '../../../backend/func2url.json';
import MultiSelect from './MultiSelect';
import Icon from '@/components/ui/icon';

interface OrderItem { name: string; size: string; color: string; qty: number; }
interface Product   { id: number; name: string; size: string; price: number; cost: number; }
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

interface Order {
  id: number; order_number: string; stage: string; city: string;
  customer_name: string; phone: string; total: number; discount: number;
  items: OrderItem[]; created_at: string; due_date: string; form?: Record<string,string>;
  is_archived: boolean; is_trashed: boolean;
}

const OLIVE = '#6b7c3a';

function fmtMoney(n: number) { return n.toLocaleString('ru-RU') + ' ₽'; }
function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function pctColor(pct: number) {
  if (pct >= 30) return OLIVE;
  if (pct >= 10) return '#ca8a04';
  return '#ef4444';
}
function pctClass(pct: number) {
  if (pct >= 30) return 'text-[#6b7c3a]';
  if (pct >= 10) return 'text-yellow-600';
  return 'text-red-500';
}

function getCost(item: OrderItem & { price?: number }, products: Product[]): { price: number; cost: number } {
  const key  = item.size ? `${item.name}__${item.size}` : item.name;
  const prod = products.find(p => {
    const pk = p.size ? `${p.name}__${p.size}` : p.name;
    return pk.toLowerCase() === key.toLowerCase();
  });
  // Цена из заказа приоритетнее справочника: исторические заказы хранят
  // свою цену и не должны менять прайс в админке (и наоборот)
  return { price: item.price || prod?.price || 0, cost: prod?.cost || 0 };
}
function calcProfit(order: Order, products: Product[]) {
  const revenue   = order.total;
  let totalCost   = 0;
  for (const item of order.items) totalCost += getCost(item, products).cost * item.qty;
  const profit = revenue - totalCost;
  const pct    = revenue > 0 ? Math.round(profit / revenue * 100) : 0;
  return { revenue, cost: totalCost, profit, pct };
}

// Группировка позиций по имени+размеру → {total, colors[]}
function buildPosGroups(items: OrderItem[]) {
  const map = new Map<string, { title: string; total: number; colors: {color:string;qty:number}[] }>();
  for (const it of items) {
    const key   = `${it.name}__${it.size||''}`;
    const title = it.size ? `${it.name} (${it.size})` : it.name;
    if (!map.has(key)) map.set(key, { title, total: 0, colors: [] });
    const g = map.get(key)!;
    g.total += it.qty;
    const ex = g.colors.find(c => c.color === (it.color||''));
    if (ex) ex.qty += it.qty; else g.colors.push({ color: it.color||'—', qty: it.qty });
  }
  return Array.from(map.values());
}

// ── Статистика клиента ────────────────────────────────────────────────────────
const ClientStats = ({ clientId, orders, products, onClose }: {
  clientId: string;
  orders: Order[];
  products: Product[];
  onClose: () => void;
}) => {
  const [selectedClient, setSelectedClient] = useState(clientId);
  const uniqueClients = useMemo(() => {
    const set = new Map<string, string>();
    for (const o of orders) {
      const key = o.phone || o.customer_name;
      if (!set.has(key)) set.set(key, `${o.city ? o.city+' · ' : ''}${o.customer_name}`);
    }
    return Array.from(set.entries()).sort((a,b) => a[1].localeCompare(b[1],'ru'));
  }, [orders]);

  const clientOrders = orders.filter(o => (o.phone || o.customer_name) === selectedClient);

  const months: Record<string, { revenue: number; profit: number; count: number }> = {};
  const posFreq: Record<string, number> = {};
  const colorFreq: Record<string, number> = {};
  let totalDisc = 0;
  for (const o of clientOrders) {
    const ym = (o.created_at||'').slice(0,7);
    if (!months[ym]) months[ym] = { revenue: 0, profit: 0, count: 0 };
    const { profit } = calcProfit(o, products);
    months[ym].revenue += o.total; months[ym].profit += profit; months[ym].count += 1;
    totalDisc += o.discount || 0;
    for (const item of o.items) {
      posFreq[item.name] = (posFreq[item.name]||0) + item.qty;
      if (item.color) colorFreq[item.color] = (colorFreq[item.color]||0) + item.qty;
    }
  }
  const monthList  = Object.entries(months).sort((a,b) => a[0].localeCompare(b[0]));
  const topPos     = Object.entries(posFreq).sort((a,b) => b[1]-a[1]).slice(0,7);
  const topColors  = Object.entries(colorFreq).sort((a,b) => b[1]-a[1]).slice(0,7);
  const avgDisc    = clientOrders.length ? Math.round(totalDisc/clientOrders.length) : 0;
  const totalRev   = clientOrders.reduce((s,o) => s+o.total, 0);
  const totalProf  = clientOrders.reduce((s,o) => s+calcProfit(o,products).profit, 0);
  const profPct    = totalRev>0 ? Math.round(totalProf/totalRev*100) : 0;
  const maxRev     = Math.max(...monthList.map(([,v])=>v.revenue), 1);
  const maxProf    = Math.max(...monthList.map(([,v])=>v.profit), 1);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-primary/25 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-primary">Статистика по клиенту</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-primary text-xl">✕</button>
        </div>

        {/* Выбор клиента */}
        <div className="mb-5">
          <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
            className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent w-full max-w-sm">
            {uniqueClients.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>

        {clientOrders.length === 0 ? <p className="text-muted-foreground">Нет данных</p> : (
          <>
            {/* Общая сводка */}
            <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4">
              {[
                ['Заказов', String(clientOrders.length)],
                ['Выручка', fmtMoney(totalRev)],
                ['Прибыль', fmtMoney(totalProf)],
                ['% прибыли', profPct+'%'],
              ].map(([label, val]) => (
                <div key={label} className="bg-card border border-primary/20 rounded-xl px-4 py-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-lg font-bold text-primary">{val}</div>
                </div>
              ))}
              {[
                ['Средняя скидка', avgDisc+'%'],
                ['Средний чек', fmtMoney(clientOrders.length ? Math.round(totalRev/clientOrders.length) : 0)],
              ].map(([label, val]) => (
                <div key={label} className="bg-card border border-primary/20 rounded-xl px-4 py-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-lg font-bold text-primary">{val}</div>
                </div>
              ))}
            </div>

            {/* График выручки по месяцам */}
            {monthList.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-primary mb-3">Выручка и прибыль по месяцам</h3>
                <div className="flex gap-1 items-end h-28 bg-primary/3 rounded-xl p-2">
                  {monthList.map(([ym, val]) => (
                    <div key={ym} className="flex flex-col items-center gap-0.5 flex-1">
                      <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: 90 }}>
                        <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.round(val.revenue/maxRev*70)}px`, backgroundColor: '#8a9a5a55' }} title={`Выручка: ${fmtMoney(val.revenue)}`} />
                        <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.round(Math.max(0,val.profit)/maxProf*70)}px`, backgroundColor: OLIVE, minHeight: 2 }} title={`Прибыль: ${fmtMoney(val.profit)}`} />
                      </div>
                      <span className="text-[9px] text-primary/50">{ym.slice(5)}.{ym.slice(2,4)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-1.5 text-xs text-primary/60">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: '#8a9a5a55' }} />Выручка</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: OLIVE }} />Прибыль</span>
                </div>
              </div>
            )}

            {/* Частота заказов */}
            {monthList.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-primary mb-2">Частота заказов</h3>
                <div className="border border-primary/20 rounded-xl overflow-hidden">
                  <table className="w-full text-sm border-collapse">
                    <thead><tr className="bg-primary/5 text-xs text-primary/60">
                      <th className="px-3 py-2 text-left font-semibold">Месяц</th>
                      <th className="px-3 py-2 text-right font-semibold">Заказов</th>
                      <th className="px-3 py-2 text-right font-semibold">Выручка</th>
                      <th className="px-3 py-2 text-right font-semibold">Прибыль</th>
                    </tr></thead>
                    <tbody>
                      {monthList.map(([ym, val]) => (
                        <tr key={ym} className="border-t border-primary/10">
                          <td className="px-3 py-2 text-primary">{ym}</td>
                          <td className="px-3 py-2 text-right text-primary">{val.count}</td>
                          <td className="px-3 py-2 text-right font-semibold text-primary">{fmtMoney(val.revenue)}</td>
                          <td className="px-3 py-2 text-right font-semibold" style={{ color: OLIVE }}>{fmtMoney(val.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Топ позиций и цветов */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Частые позиции</h3>
                <div className="space-y-2">
                  {topPos.map(([name, qty]) => {
                    const maxQty = topPos[0][1];
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-sm mb-0.5">
                          <span className="text-primary/80 truncate text-xs">{name}</span>
                          <span className="font-bold text-primary ml-2 text-xs flex-shrink-0">{qty} шт</span>
                        </div>
                        <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.round(qty/maxQty*100)}%`, backgroundColor: OLIVE }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Частые цвета</h3>
                <div className="space-y-2">
                  {topColors.map(([color, qty]) => {
                    const maxQty = topColors[0][1];
                    return (
                      <div key={color}>
                        <div className="flex justify-between text-sm mb-0.5">
                          <span className="text-primary/80 capitalize text-xs">{color}</span>
                          <span className="font-bold text-primary ml-2 text-xs flex-shrink-0">{qty} шт</span>
                        </div>
                        <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.round(qty/maxQty*100)}%`, backgroundColor: '#c4a882' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Главный компонент ─────────────────────────────────────────────────────────
const AdminIncome = () => {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'orders' | 'clients'>('orders');
  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [statsClient, setStatsClient] = useState<string | null>(null);

  // Фильтры
  const [search, setSearch]         = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [discountMin, setDiscountMin] = useState('');
  const [discountMax, setDiscountMax] = useState('');
  const [profitMin, setProfitMin]   = useState('');
  const [fYears, setFYears]   = useState<number[]>([]);
  const [fMonths, setFMonths] = useState<number[]>([]);
  const [fCities, setFCities] = useState<string[]>([]);
  const [fClients, setFClients] = useState<string[]>([]);
  const [sortBy, setSortBy]   = useState<'date_desc'|'date_asc'|'sum_desc'|'sum_asc'|'profit_desc'>('date_desc');
  const [clientSort, setClientSort] = useState<'sum_desc'|'sum_asc'|'orders_desc'|'profit_desc'|'name_asc'>('sum_desc');

  const toggleF = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  useEffect(() => {
    (async () => {
      try {
        const [ordRes, prodRes] = await Promise.all([fetch(urls['orders']), fetch(`${urls['products']}?raw=1`)]);
        const [ordData, prodData] = await Promise.all([ordRes.json(), prodRes.json()]);
        setOrders((ordData.orders||[]).filter((o: Order) => !o.is_trashed));
        setProducts(prodData.products || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const list = orders.filter(o => {
      const d = o.created_at ? new Date(o.created_at) : null;
      if (fYears.length  && (!d || !fYears.includes(d.getFullYear()))) return false;
      if (fMonths.length && (!d || !fMonths.includes(d.getMonth() + 1))) return false;
      if (fCities.length && !fCities.includes(o.city || '—')) return false;
      if (fClients.length && !fClients.includes(o.phone || o.customer_name)) return false;
      if (discountMax && (o.discount || 0) > parseInt(discountMax)) return false;
      if (search && !o.customer_name.toLowerCase().includes(search.toLowerCase()) && !o.city.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateFrom && (o.created_at||'') < dateFrom) return false;
      if (dateTo   && (o.created_at||'') > dateTo + 'T23:59:59') return false;
      if (discountMin && (o.discount||0) < parseInt(discountMin)) return false;
      if (profitMin) {
        const { pct } = calcProfit(o, products);
        if (pct < parseInt(profitMin)) return false;
      }
      return true;
    });
    const ts = (o: Order) => o.created_at ? new Date(o.created_at).getTime() : 0;
    const pf = (o: Order) => calcProfit(o, products).profit;
    const cmp: Record<string, (a: Order, b: Order) => number> = {
      date_desc:   (a, b) => ts(b) - ts(a),
      date_asc:    (a, b) => ts(a) - ts(b),
      sum_desc:    (a, b) => b.total - a.total,
      sum_asc:     (a, b) => a.total - b.total,
      profit_desc: (a, b) => pf(b) - pf(a),
    };
    return [...list].sort(cmp[sortBy]);
  }, [orders, search, dateFrom, dateTo, discountMin, discountMax, profitMin, products,
      fYears, fMonths, fCities, fClients, sortBy]);

  // Опции фильтров — строятся из всех заказов
  const yearOpts = useMemo(() => Array.from(new Set(orders.map(o =>
    o.created_at ? new Date(o.created_at).getFullYear() : 0).filter(Boolean)))
    .sort((a, b) => b - a).map(y => ({ value: y, label: String(y) })), [orders]);
  const cityOpts = useMemo(() => Array.from(new Set(orders.map(o => o.city || '—')))
    .sort((a, b) => a.localeCompare(b, 'ru')).map(c => ({ value: c, label: c })), [orders]);
  const clientOpts = useMemo(() => Array.from(new Map(orders.map(o =>
    [o.phone || o.customer_name, `${o.city ? o.city + ' · ' : ''}${o.customer_name}`])).entries())
    .sort((a, b) => a[1].localeCompare(b[1], 'ru'))
    .map(([value, label]) => ({ value, label })), [orders]);

  const totalRevenue = filtered.reduce((s,o) => s+o.total, 0);
  const totalProfit  = filtered.reduce((s,o) => s+calcProfit(o,products).profit, 0);
  const avgPct       = totalRevenue>0 ? Math.round(totalProfit/totalRevenue*100) : 0;

  // Для вкладки клиентов
  const uniqueClients = useMemo(() => {
    const map = new Map<string, { name: string; orders: number; total: number; profit: number }>();
    for (const o of filtered) {
      const key = o.phone || o.customer_name;
      if (!map.has(key)) map.set(key, { name: `${o.city ? o.city+' · ':'' }${o.customer_name}`, orders: 0, total: 0, profit: 0 });
      const c = map.get(key)!;
      c.orders += 1; c.total += o.total; c.profit += calcProfit(o, products).profit;
    }
    const cmp: Record<string, (a: [string, typeof arr[0][1]], b: [string, typeof arr[0][1]]) => number> = {
      sum_desc:    (a, b) => b[1].total - a[1].total,
      sum_asc:     (a, b) => a[1].total - b[1].total,
      orders_desc: (a, b) => b[1].orders - a[1].orders,
      profit_desc: (a, b) => b[1].profit - a[1].profit,
      name_asc:    (a, b) => a[1].name.localeCompare(b[1].name, 'ru'),
    };
    const arr = Array.from(map.entries());
    return arr.sort(cmp[clientSort]);
  }, [filtered, products, clientSort]);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-semibold text-primary">Поступления</h1>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1.5 mb-5 border-b-2 border-primary/15 pb-0">
        {([['orders','📊 Статистика по заказам'],['clients','👥 Статистика по клиентам']] as const).map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-0.5 ${tab===key ? 'border-primary text-primary' : 'border-transparent text-primary/50 hover:text-primary'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Сводка (общая) */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="bg-card border border-primary/25 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Выручка</div>
          <div className="text-2xl font-bold text-primary">{fmtMoney(totalRevenue)}</div>
        </div>
        <div className="bg-card border rounded-2xl px-5 py-3" style={{ borderColor: OLIVE+'44' }}>
          <div className="text-xs text-muted-foreground">Чистая прибыль</div>
          <div className="text-2xl font-bold" style={{ color: OLIVE }}>{fmtMoney(totalProfit)}</div>
        </div>
        <div className="bg-card border border-primary/25 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Средний %</div>
          <div className={`text-2xl font-bold ${pctClass(avgPct)}`}>{avgPct}%</div>
        </div>
        <div className="bg-card border border-primary/25 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Заказов</div>
          <div className="text-2xl font-bold text-primary">{filtered.length}</div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-primary/3 border border-primary/15 rounded-2xl px-4 py-3 mb-5 space-y-3">
        <div className="flex gap-3 flex-wrap items-start">
          <MultiSelect label="Год" width="w-32" options={yearOpts}
            selected={fYears} onToggle={v => toggleF(fYears, v, setFYears)} />
          <MultiSelect label="Месяц" width="w-44" options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
            selected={fMonths} onToggle={v => toggleF(fMonths, v, setFMonths)} />
          <MultiSelect label="Город" width="w-48" options={cityOpts}
            selected={fCities} onToggle={v => toggleF(fCities, v, setFCities)} />
          {tab === 'clients' && (
            <MultiSelect label="Клиент" width="w-56" options={clientOpts}
              selected={fClients} onToggle={v => toggleF(fClients, v, setFClients)} />
          )}
          <div className="w-52">
            <label className="text-[11px] text-primary/50 block mb-1">Сортировка</label>
            {tab === 'orders' ? (
              <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm bg-background text-primary outline-none focus:border-accent">
                <option value="date_desc">Сначала новые</option>
                <option value="date_asc">Сначала старые</option>
                <option value="sum_desc">Сумма ↓</option>
                <option value="sum_asc">Сумма ↑</option>
                <option value="profit_desc">Прибыль ↓</option>
              </select>
            ) : (
              <select value={clientSort} onChange={e => setClientSort(e.target.value as typeof clientSort)}
                className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm bg-background text-primary outline-none focus:border-accent">
                <option value="sum_desc">Сумма ↓</option>
                <option value="sum_asc">Сумма ↑</option>
                <option value="orders_desc">Заказов ↓</option>
                <option value="profit_desc">Прибыль ↓</option>
                <option value="name_asc">По названию</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap items-center pt-1 border-t border-primary/10">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск: клиент / город..."
            className="border border-primary/30 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-accent bg-background flex-1 min-w-[160px]" />
          <div className="flex items-center gap-1.5 text-xs text-primary/60">
            <span>Период</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border border-primary/30 rounded-xl px-2 py-1.5 text-sm outline-none focus:border-accent bg-background" />
            <span>—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border border-primary/30 rounded-xl px-2 py-1.5 text-sm outline-none focus:border-accent bg-background" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary/60">
            <span>Скидка от</span>
            <input type="number" min={0} max={100} value={discountMin} onChange={e => setDiscountMin(e.target.value)}
              placeholder="%" className="border border-primary/30 rounded-xl px-2 py-1.5 text-sm outline-none focus:border-accent bg-background w-16" />
            <span>до</span>
            <input type="number" min={0} max={100} value={discountMax} onChange={e => setDiscountMax(e.target.value)}
              placeholder="%" className="border border-primary/30 rounded-xl px-2 py-1.5 text-sm outline-none focus:border-accent bg-background w-16" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary/60">
            <span>% прибыли от</span>
            <input type="number" min={0} max={100} value={profitMin} onChange={e => setProfitMin(e.target.value)}
              placeholder="%" className="border border-primary/30 rounded-xl px-2 py-1.5 text-sm outline-none focus:border-accent bg-background w-16" />
          </div>
          {(search||dateFrom||dateTo||discountMin||discountMax||profitMin||fYears.length||fMonths.length||fCities.length||fClients.length) ? (
            <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setDiscountMin(''); setDiscountMax('');
              setProfitMin(''); setFYears([]); setFMonths([]); setFCities([]); setFClients([]); }}
              className="text-xs text-primary/50 hover:text-primary underline">Сбросить всё</button>
          ) : null}
        </div>
      </div>

      {loading ? <p className="text-muted-foreground">Загружаю...</p> : tab === 'orders' ? (
        /* ВКЛАДКА ЗАКАЗЫ */
        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-muted-foreground">Нет заказов по фильтру.</p>}
          {filtered.map(order => {
            const { revenue, cost, profit, pct } = calcProfit(order, products);
            const isExpanded = expandedId === order.id;
            const posGroups  = buildPosGroups(order.items);
            return (
              <div key={order.id} className="border border-primary/20 rounded-2xl overflow-hidden">
                <div className="flex items-stretch gap-4 px-5 py-3.5 cursor-pointer hover:bg-primary/3 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}>

                  {/* Клиент: город → имя → позывной */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon name="MapPin" size={12} className="text-primary/35 flex-shrink-0" />
                      <span className="text-[11px] uppercase tracking-wide text-primary/45 font-semibold truncate">
                        {order.city || 'Город не указан'}
                      </span>
                    </div>
                    <div className="font-semibold text-primary text-[15px] leading-tight truncate">
                      {order.customer_name}
                    </div>
                    {order.form?.callsign && order.form.callsign !== order.customer_name && (
                      <div className="text-xs text-primary/45 truncate mt-0.5">{order.form.callsign}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] text-primary/50">{fmtDate(order.created_at)}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/8 text-primary/70 font-medium">
                        {order.stage}
                      </span>
                      {order.discount > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
                          скидка {order.discount}%
                        </span>
                      )}
                      <button className="text-[11px] px-2 py-0.5 rounded-full border border-primary/20 text-primary/50 hover:text-primary hover:border-primary/50 transition-colors"
                        onClick={e => { e.stopPropagation(); setStatsClient(order.phone || order.customer_name); }}>
                        Статистика
                      </button>
                    </div>
                  </div>

                  {/* Деньги: выручка / прибыль / % — колонками */}
                  <div className="flex items-center gap-5 flex-shrink-0 pl-4 border-l border-primary/12">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-primary/40 font-semibold">Сумма</div>
                      <div className="font-bold text-primary text-[15px] tabular-nums">{fmtMoney(revenue)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-primary/40 font-semibold">Прибыль</div>
                      <div className="font-bold text-[15px] tabular-nums" style={{ color: pctColor(pct) }}>{fmtMoney(profit)}</div>
                    </div>
                    <div className="text-center min-w-[54px] rounded-xl px-2 py-1.5"
                      style={{ backgroundColor: pctColor(pct) + '14' }}>
                      <div className="font-bold text-lg leading-none tabular-nums" style={{ color: pctColor(pct) }}>{pct}%</div>
                      <div className="text-[9px] uppercase tracking-wide text-primary/40 font-semibold mt-0.5">маржа</div>
                    </div>
                    <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-primary/30" />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-primary/10 px-5 pb-4 pt-3 bg-primary/3">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-xs text-primary/50 border-b border-primary/10">
                          <th className="py-2 pl-3 pr-2 text-left font-semibold">Позиция / Цвет</th>
                          <th className="py-2 px-2 text-right font-semibold">Кол-во</th>
                          <th className="py-2 px-2 text-right font-semibold">Цена</th>
                          <th className="py-2 px-2 text-right font-semibold">Сумма</th>
                          <th className="py-2 px-2 text-right font-semibold">Затраты</th>
                          <th className="py-2 px-2 text-right font-semibold">Прибыль</th>
                          <th className="py-2 px-2 text-right font-semibold">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posGroups.map((g, gi) => {
                          // Цена и затраты для группы
                          const sampleItem = order.items.find(it => it.name === (g.title.includes('(') ? g.title.slice(0, g.title.indexOf(' (')) : g.title));
                          const { price: basePrice, cost: baseCost } = sampleItem ? getCost(sampleItem, products) : { price: 0, cost: 0 };
                          const discMult   = 1 - (order.discount||0)/100;
                          const groupRev   = basePrice * g.total * discMult;
                          const groupCost  = baseCost * g.total;
                          const groupProfit = groupRev - groupCost;
                          const groupPct   = groupRev > 0 ? Math.round(groupProfit/groupRev*100) : 0;
                          return (
                            <Fragment key={`g-${gi}`}>
                              {/* Строка-шапка позиции */}
                              <tr className="bg-primary/5 border-b border-primary/10">
                                <td className="py-2 pl-3 pr-2 text-primary font-semibold">{g.title}</td>
                                <td className="py-2 px-2 text-right font-bold text-primary">{g.total}</td>
                                <td className="py-2 px-2 text-right text-primary/60">{basePrice > 0 ? fmtMoney(Math.round(basePrice*discMult)) : '—'}</td>
                                <td className="py-2 px-2 text-right font-bold text-primary">{groupRev > 0 ? fmtMoney(Math.round(groupRev)) : '—'}</td>
                                <td className="py-2 px-2 text-right text-primary/60">{groupCost > 0 ? fmtMoney(groupCost) : '—'}</td>
                                <td className="py-2 px-2 text-right font-semibold" style={{ color: pctColor(groupPct) }}>{groupRev > 0 ? fmtMoney(Math.round(groupProfit)) : '—'}</td>
                                <td className="py-2 px-2 text-right font-bold" style={{ color: pctColor(groupPct) }}>{groupRev > 0 ? groupPct+'%' : '—'}</td>
                              </tr>
                              {/* Строки цветов */}
                              {g.colors.map((c, ci) => (
                                <tr key={`c-${gi}-${ci}`} className="border-b border-primary/8 last:border-0">
                                  <td className="py-1.5 pl-7 pr-2 text-primary/55 text-xs">{c.color}</td>
                                  <td className="py-1.5 px-2 text-right text-primary/55 text-xs tabular-nums">{c.qty}</td>
                                  <td colSpan={5} />
                                </tr>
                              ))}
                            </Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-primary/20 font-bold text-sm">
                          <td className="py-2.5 pl-3 pr-2 text-primary" colSpan={3}>ИТОГО</td>
                          <td className="py-2.5 px-2 text-right text-primary">{fmtMoney(revenue)}</td>
                          <td className="py-2.5 px-2 text-right text-primary/60">{fmtMoney(cost)}</td>
                          <td className="py-2.5 px-2 text-right" style={{ color: pctColor(pct) }}>{fmtMoney(profit)}</td>
                          <td className="py-2.5 px-2 text-right font-bold text-lg" style={{ color: pctColor(pct) }}>{pct}%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ВКЛАДКА КЛИЕНТЫ */
        <div>
          <div className="border border-primary/20 rounded-2xl overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-primary/5 text-xs text-primary/60 border-b border-primary/20">
                  <th className="px-4 py-2.5 text-left font-semibold">Клиент</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Заказов</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Выручка</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Прибыль</th>
                  <th className="px-4 py-2.5 text-right font-semibold">%</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {uniqueClients.map(([key, c]) => {
                  const pct = c.total>0 ? Math.round(c.profit/c.total*100) : 0;
                  return (
                    <tr key={key} className="border-b border-primary/10 last:border-0 hover:bg-primary/3">
                      <td className="px-4 py-2.5 text-primary font-medium">{c.name}</td>
                      <td className="px-4 py-2.5 text-right text-primary">{c.orders}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-primary">{fmtMoney(c.total)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color: OLIVE }}>{fmtMoney(c.profit)}</td>
                      <td className="px-4 py-2.5 text-right font-bold" style={{ color: pctColor(pct) }}>{pct}%</td>
                      <td className="px-4 py-2.5 text-center">
                        <button onClick={() => setStatsClient(key)} className="text-xs px-2 py-1 rounded-lg border border-primary/25 text-primary/60 hover:text-primary hover:border-primary transition-colors">
                          📊
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {uniqueClients.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Нет данных</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Статистика по клиенту */}
      {statsClient && (
        <ClientStats clientId={statsClient} orders={filtered} products={products} onClose={() => setStatsClient(null)} />
      )}
    </div>
  );
};

export default AdminIncome;
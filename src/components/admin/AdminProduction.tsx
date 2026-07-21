import { useState, useEffect } from 'react';
import urls from '../../../backend/func2url.json';
import { Order, groupPositions, fmtDate, fmtMoney, fmtDateShort, STAGES, CLOSED_STAGE, canAdvanceStage } from './orderUtils';
import OrderFullCard from './OrderFullCard';

const PROD_STAGES = STAGES.slice(STAGES.indexOf('В очереди на плетение'));
const OLIVE = '#6b7c3a';
type ProdFilter = 'waiting' | 'working' | 'done';

function pct(done: number, qty: number) { return qty <= 0 ? 0 : Math.round(done/qty*100); }
function nextStage(current: string): string | null {
  const work = STAGES.filter(s => s !== CLOSED_STAGE);
  const idx = work.indexOf(current);
  return idx === -1 || idx >= work.length-1 ? null : work[idx+1];
}

const ProductionCard = ({ order, warehouseMap, onUpdateProduced, onUpdateStage, onOpenFull }: {
  order: Order;
  warehouseMap: Record<string, number>;
  onUpdateProduced: (order: Order, key: string, catalogName: string, delta: number, max: number) => void;
  onUpdateStage: (id: number, stage: string) => void;
  onOpenFull: (o: Order) => void;
}) => {
  const [expanded, setExpanded]     = useState(false);
  const [showColors, setShowColors] = useState(false);
  const positions = groupPositions(order.items);
  const produced  = order.produced || {};
  const totalQty  = positions.reduce((s,p)=>s+p.total, 0);
  const totalDone = positions.reduce((s,p)=>s+Math.min(produced[p.key]||0, p.total), 0);
  const totalLeft = totalQty - totalDone;
  const totalPct  = pct(totalDone, totalQty);
  const totalStock = positions.reduce((s,p)=>s+(warehouseMap[p.title]||0), 0);
  const next      = nextStage(order.stage);

  return (
    <div className="bg-card border border-primary/30 rounded-2xl overflow-hidden cursor-pointer hover:border-primary transition-colors">
      <div className="p-4" onClick={() => setExpanded(v => !v)}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex-1">
            {/* Кнопки сверху */}
            <div className="flex items-center gap-2 mb-2 flex-wrap" onClick={e => e.stopPropagation()}>
              {next && (() => {
                const check = canAdvanceStage(order, next);
                return check.ok ? (
                  <button onClick={() => onUpdateStage(order.id, next)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground font-semibold transition-colors">
                    → {next}
                  </button>
                ) : (
                  <span title={check.reason}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-primary/10 text-primary/40 cursor-not-allowed select-none"
                    style={{ borderBottom: '2px solid #e2e8f0' }}>
                    → {next} 🔒
                  </span>
                );
              })()}
              <button onClick={() => onOpenFull(order)}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-primary/30 text-primary/60 hover:text-primary hover:border-primary transition-colors">
                ↗ Карточка
              </button>
              <button onClick={e => { e.stopPropagation(); setShowColors(v => !v); }}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-primary/30 text-primary/60 hover:text-primary hover:border-primary transition-colors">
                {showColors ? '🎨 Скрыть цвета' : '🎨 Цвета'}
              </button>
            </div>
            <div className="text-[11px] text-primary/70 mb-1">#{order.order_number} {fmtDate(order.created_at)}</div>
            <div className="font-bold text-primary leading-tight">{order.city} {order.customer_name}</div>
            <div className="font-bold text-primary mb-1">{fmtMoney(order.total)}</div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {order.due_date && <span className="px-2 py-0.5 rounded-full bg-accent/15 text-primary border border-accent/30">Готовность: {fmtDateShort(order.due_date)}</span>}
              {order.due_weaving && <span className="px-2 py-0.5 rounded-full bg-primary/8 text-primary/80 border border-primary/20">Плетение до: {fmtDateShort(order.due_weaving)}</span>}
            </div>
          </div>
          <div className="border-t border-primary/20 md:border-t-0 md:border-l md:border-primary/20 pt-3 md:pt-0 md:pl-4 min-w-[240px]" onClick={e => e.stopPropagation()}>
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-primary/5">
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20">Кол-во</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20">На складе</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20">Готово</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20">Остаток</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20">%</th>
              </tr></thead>
              <tbody><tr>
                <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{totalQty}</td>
                <td className="px-2 py-1.5 text-center font-bold border border-primary/20" style={{color: totalStock>0?OLIVE:undefined}}>{totalStock}</td>
                <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{totalDone}</td>
                <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{totalLeft}</td>
                <td className="px-2 py-1.5 text-center font-bold border border-primary/20" style={{color:OLIVE}}>{totalPct}%</td>
              </tr></tbody>
            </table>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-primary/20" onClick={e => e.stopPropagation()}>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-primary/5">
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-8">№</th>
                <th className="px-3 py-1.5 text-left font-semibold text-primary border border-primary/20">Позиция</th>
                {showColors && <th className="px-2 py-1.5 text-left font-semibold text-primary border border-primary/20">Цвета</th>}
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-16">Кол-во</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-16">На складе</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-20">Сделано</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-16">Готово</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-16">Остаток</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-14">%</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => {
                const done  = Math.min(produced[pos.key]||0, pos.total);
                const left  = pos.total - done;
                const stock = warehouseMap[pos.title] || 0;
                return (
                  <tr key={pos.key}>
                    <td className="px-2 py-1.5 text-center text-primary font-semibold border border-primary/10">{i+1}</td>
                    <td className="px-3 py-1.5 text-primary border border-primary/10 break-words">{pos.title}</td>
                    {showColors && (
                      <td className="px-2 py-1.5 border border-primary/10">
                        {pos.colors.map((c,ci) => <div key={ci} className="text-[10px] text-primary/70">{c.color}: {c.qty}</div>)}
                      </td>
                    )}
                    <td className="px-2 py-1.5 text-center text-primary font-bold border border-primary/10">{pos.total}</td>
                    <td className="px-2 py-1.5 text-center font-bold border border-primary/10" style={{color: stock>0?OLIVE:undefined}}>{stock}</td>
                    <td className="px-1 py-1 text-center border border-primary/10">
                      <input type="number" placeholder="0" key={`${pos.key}-${done}`}
                        onBlur={e => {
                          const delta = parseInt(e.target.value, 10) || 0;
                          if (delta !== 0) onUpdateProduced(order, pos.key, pos.title, delta, pos.total);
                          e.target.value = '';
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const delta = parseInt((e.target as HTMLInputElement).value, 10) || 0;
                            if (delta !== 0) onUpdateProduced(order, pos.key, pos.title, delta, pos.total);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="w-14 text-center border border-primary/30 rounded px-1 py-0.5 bg-background outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </td>
                    <td className="px-2 py-1.5 text-center text-primary font-bold border border-primary/10">{done}</td>
                    <td className="px-2 py-1.5 text-center text-primary font-bold border border-primary/10">{left}</td>
                    <td className="px-2 py-1.5 text-center font-semibold border border-primary/10" style={{color:OLIVE}}>{pct(done,pos.total)}%</td>
                  </tr>
                );
              })}
              <tr className="bg-primary/5 border-t-2 border-primary/30">
                <td className="border border-primary/20" />
                <td className="px-3 py-1.5 text-center font-bold text-primary border border-primary/20" colSpan={showColors ? 2 : 1}>ИТОГО</td>
                <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{totalQty}</td>
                <td className="px-2 py-1.5 text-center font-bold border border-primary/20" style={{color: totalStock>0?OLIVE:undefined}}>{totalStock}</td>
                <td className="border border-primary/20" />
                <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{totalDone}</td>
                <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{totalLeft}</td>
                <td className="px-2 py-1.5 text-center font-bold border border-primary/20" style={{color:OLIVE}}>{totalPct}%</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[10px] text-primary/50 px-3 py-2">
            В «Сделано» вводите количество за один раз — оно прибавится к «Готово» и спишется со склада (готовые корзины с ручкой). Для исправления ошибки введите отрицательное число.
          </p>
        </div>
      )}
    </div>
  );
};

const AdminProduction = () => {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [warehouseMap, setWarehouseMap] = useState<Record<string, number>>({});
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<ProdFilter>('working');
  const [fullOrder, setFullOrder] = useState<Order | null>(null);

  const loadWarehouse = async () => {
    const res  = await fetch(`${urls['reports']}?type=warehouse`);
    const data = await res.json();
    const map: Record<string, number> = {};
    for (const item of (data.items || [])) map[item.catalog_name] = item.qty_full;
    setWarehouseMap(map);
  };

  const load = async () => {
    const res = await fetch(urls['orders']);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };
  useEffect(() => { load(); loadWarehouse(); }, []);

  // Сделано: вносим ДЕЛЬТУ, прибавляем к order.produced[key] (=«Готово»), списываем со склада
  const updateProduced = async (order: Order, key: string, catalogName: string, delta: number, max: number) => {
    const produced = order.produced || {};
    const current   = Math.min(produced[key] || 0, max);
    const nextVal   = Math.max(0, Math.min(current + delta, max));
    const realDelta = nextVal - current; // фактическое изменение (после клампа)
    if (realDelta === 0) return;

    const newProduced = { ...produced, [key]: nextVal };
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, produced: newProduced } : o));
    setWarehouseMap(prev => ({ ...prev, [catalogName]: Math.max(0, (prev[catalogName] || 0) - realDelta) }));

    await Promise.all([
      fetch(urls['orders'], { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: order.id, produced: newProduced }) }),
      fetch(urls['reports'], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        type: 'warehouse_consume', catalog_name: catalogName, delta: realDelta,
        comment: `Заказ #${order.order_number}`, created_by: 'Производство',
      }) }),
    ]);
  };

  const updateStage = async (id: number, stage: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, stage } : o));
    if (fullOrder?.id === id) setFullOrder(prev => prev ? { ...prev, stage } : prev);
    await fetch(urls['orders'], { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, stage }) });
  };

  const allProdOrders = orders.filter(o => PROD_STAGES.includes(o.stage) && !o.is_archived && !o.is_trashed);
  const waitingOrders = allProdOrders.filter(o => o.stage === 'В очереди на плетение');
  const workingOrders = allProdOrders.filter(o => o.stage === 'Плетение');
  const doneOrders    = allProdOrders.filter(o => {
    const pos = groupPositions(o.items);
    const tq = pos.reduce((s,p)=>s+p.total,0);
    const td = pos.reduce((s,p)=>s+Math.min((o.produced||{})[p.key]||0,p.total),0);
    return tq > 0 && td >= tq && o.stage !== 'В очереди на плетение';
  });
  const visibleOrders = filter === 'waiting' ? waitingOrders : filter === 'working' ? workingOrders : doneOrders;

  const FILTERS: { key: ProdFilter; label: string; count: number }[] = [
    { key: 'waiting', label: 'Ожидают плетения', count: waitingOrders.length },
    { key: 'working', label: 'В работе',          count: workingOrders.length },
    { key: 'done',    label: 'Выполнены',          count: doneOrders.length   },
  ];

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <h1 className="font-display text-2xl font-semibold text-primary">Производство</h1>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${filter===f.key?'bg-primary text-white border-primary':'border-primary/40 text-primary hover:border-primary'}`}>
              {f.label}
              {f.count > 0 && <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter===f.key?'bg-white/30':'bg-primary/10'}`}>{f.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-muted-foreground">Загружаю...</p> :
       visibleOrders.length === 0 ? (
        <p className="text-muted-foreground">
          {filter==='waiting'?'Нет заказов в очереди на плетение.':filter==='working'?'Нет заказов в работе.':'Нет выполненных заказов.'}
        </p>
       ) : (
        <div className="space-y-4 max-w-5xl">
          {visibleOrders.map(order => (
            <ProductionCard key={order.id} order={order} warehouseMap={warehouseMap}
              onUpdateProduced={updateProduced} onUpdateStage={updateStage} onOpenFull={setFullOrder} />
          ))}
        </div>
       )}

      {fullOrder && (
        <OrderFullCard order={fullOrder} onClose={() => setFullOrder(null)}
          onUpdate={(id, patch) => {
            setOrders(p => p.map(o => o.id===id?{...o,...patch}:o));
            setFullOrder(p => p?{...p,...patch}:p);
            fetch(urls['orders'],{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...patch})});
          }}
          onOpenClient={() => window.open('/admin/clients', '_blank')}
        />
      )}
    </div>
  );
};

export default AdminProduction;

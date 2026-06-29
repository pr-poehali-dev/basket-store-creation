import { useState, useEffect, useRef } from 'react';
import urls from '../../../backend/func2url.json';
import { Order, OrderItem, fmtDate, fmtMoney, fmtDateShort, STAGES, CLOSED_STAGE, canAdvanceStage } from './orderUtils';
import OrderFullCard from './OrderFullCard';

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

const PAINTING_STAGES = STAGES.slice(STAGES.indexOf('В очереди на плетение'));
const OLIVE = '#6b7c3a';
type PaintFilter = 'weaving' | 'working' | 'done';

function pct(done: number, qty: number) { return qty<=0?0:Math.round(done/qty*100); }
function nextStage(current: string): string | null {
  const work = STAGES.filter(s => s !== CLOSED_STAGE);
  const idx = work.indexOf(current);
  return idx===-1||idx>=work.length-1?null:work[idx+1];
}
function groupByColor(items: OrderItem[]): Map<string, { posKey: string; posTitle: string; qty: number }[]> {
  const map = new Map<string, { posKey: string; posTitle: string; qty: number }[]>();
  for (const it of items) {
    const color = (it.color||'').toLowerCase().trim();
    if (color==='натуральный'||color==='') continue;
    const posKey=`${it.name}__${it.size}`; const posTitle=it.size?`${it.name} (${it.size})`:it.name;
    if (!map.has(color)) map.set(color,[]);
    const arr=map.get(color)!; const existing=arr.find(p=>p.posKey===posKey);
    if (existing) existing.qty+=it.qty; else arr.push({posKey,posTitle,qty:it.qty});
  }
  return map;
}

type PosRow = { posKey: string; posTitle: string; qty: number };

const PaintingCard = ({ order, colorFilter, onUpdatePainted, onUpdateStage, onOpenFull }: {
  order: Order;
  colorFilter: string | null;
  onUpdatePainted: (id: number, painted: Record<string, number>) => void;
  onUpdateStage: (id: number, stage: string) => void;
  onOpenFull: (o: Order) => void;
}) => {
  const [expanded, setExpanded] = useState(!!colorFilter);
  const prevFilter = useRef(colorFilter);
  useEffect(() => {
    if (colorFilter !== prevFilter.current) { if (colorFilter) setExpanded(true); prevFilter.current = colorFilter; }
  }, [colorFilter]);

  const byColor   = groupByColor(order.items);
  const painted   = order.painted || {};
  const produced  = order.produced || {};
  const colorsToShow: [string, PosRow[]][] = colorFilter
    ? (byColor.has(colorFilter) ? [[colorFilter, byColor.get(colorFilter)!]] : [])
    : Array.from(byColor.entries());
  if (colorsToShow.length === 0) return null;

  let sumQty=0, sumPainted=0;
  for (const [,positions] of colorsToShow) {
    for (const pos of positions) { sumQty+=pos.qty; sumPainted+=Math.min(painted[pos.posKey]||0,pos.qty); }
  }
  const totalPct = pct(sumPainted, sumQty);
  const next = nextStage(order.stage);

  const setPainted = (posKey: string, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(val, max));
    onUpdatePainted(order.id, { ...painted, [posKey]: clamped });
  };

  return (
    <div onClick={() => setExpanded(v => !v)}
      className="bg-card border border-primary/40 rounded-2xl overflow-hidden cursor-pointer hover:border-primary transition-colors">
      <div className="p-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
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
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-primary/10 text-primary/40 cursor-not-allowed select-none">
                    → {next} 🔒
                  </span>
                );
              })()}
              <button onClick={() => onOpenFull(order)}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-primary/30 text-primary/60 hover:text-primary hover:border-primary transition-colors">
                ↗ Карточка
              </button>
            </div>
            <div className="text-[11px] text-primary/70 mb-1">#{order.order_number} {fmtDate(order.created_at)}</div>
            <div className="font-bold text-primary leading-tight">{order.city} {order.customer_name}</div>
            <div className="font-bold text-primary mb-1">{fmtMoney(order.total)}</div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {order.due_date && <span className="px-2 py-0.5 rounded-full bg-accent/15 text-primary border border-accent/30">Готовность: {fmtDateShort(order.due_date)}</span>}
              {order.due_painting && <span className="px-2 py-0.5 rounded-full bg-primary/8 text-primary/80 border border-primary/20">Покраска до: {fmtDateShort(order.due_painting)}</span>}
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {Array.from(byColor.keys()).map(color => {
                const colorDef = PAINT_COLORS.find(c=>c.name===color);
                return (
                  <span key={color} className="text-[10px] px-2 py-0.5 rounded-full border border-primary/20 font-medium"
                    style={colorDef?{backgroundColor:colorDef.hex,color:'#3a2a1a'}:{backgroundColor:'#eee',color:'#555'}}>
                    {color.slice(0,3)}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="border-t border-primary/20 md:border-t-0 md:border-l md:border-primary/20 pt-3 md:pt-0 md:pl-4 min-w-[220px]" onClick={e => e.stopPropagation()}>
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-primary/5">
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20">Кол-во</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20">Покрашено</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20">Остаток</th>
                <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20">%</th>
              </tr></thead>
              <tbody><tr>
                <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{sumQty}</td>
                <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{sumPainted}</td>
                <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{sumQty-sumPainted}</td>
                <td className="px-2 py-1.5 text-center font-bold border border-primary/20" style={{color:OLIVE}}>{totalPct}%</td>
              </tr></tbody>
            </table>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-primary/20 space-y-0" onClick={e => e.stopPropagation()}>
          {colorsToShow.map(([color, positions]) => {
            const colorDef = PAINT_COLORS.find(c=>c.name===color);
            let colorQty=0, colorPainted=0;
            for (const pos of positions) { colorQty+=pos.qty; colorPainted+=Math.min(painted[pos.posKey]||0,pos.qty); }
            return (
              <div key={color} className="border-b border-primary/10 last:border-0">
                <div className="px-4 py-2 flex items-center gap-2 font-bold text-sm"
                  style={colorDef?{backgroundColor:colorDef.hex+'55',color:'#3a2a1a'}:{backgroundColor:'#eee',color:'#333'}}>
                  <span className="w-4 h-4 rounded-full border border-black/10" style={{backgroundColor:colorDef?.hex||'#ccc'}} />
                  <span className="uppercase tracking-wide">{color}</span>
                </div>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-primary/5">
                      <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-8">№</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-primary border border-primary/20">Позиция</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-16">Кол-во</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-20">Сплетено</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-20">Покрашено</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-16">Остаток</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-primary border border-primary/20 w-14">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos, i) => {
                      const woven      = produced[pos.posKey]||0;
                      const paintedVal = Math.min(painted[pos.posKey]||0, pos.qty);
                      const left       = pos.qty - paintedVal;
                      return (
                        <tr key={pos.posKey}>
                          <td className="px-2 py-1.5 text-center text-primary font-semibold border border-primary/10">{i+1}</td>
                          <td className="px-3 py-1.5 text-primary border border-primary/10 break-words">{pos.posTitle}</td>
                          <td className="px-2 py-1.5 text-center text-primary font-bold border border-primary/10">{pos.qty}</td>
                          <td className="px-2 py-1.5 text-center text-primary/60 border border-primary/10">{woven}</td>
                          <td className="px-1 py-1 text-center border border-primary/10">
                            <input type="number" min={0} max={pos.qty}
                              defaultValue={paintedVal} key={`${pos.posKey}-${paintedVal}`}
                              onBlur={e => setPainted(pos.posKey, parseInt(e.target.value,10)||0, pos.qty)}
                              onKeyDown={e => e.key==='Enter' && setPainted(pos.posKey, parseInt((e.target as HTMLInputElement).value,10)||0, pos.qty)}
                              className="w-14 text-center border border-primary/30 rounded px-1 py-0.5 bg-background outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          </td>
                          <td className="px-2 py-1.5 text-center text-primary font-bold border border-primary/10">{left}</td>
                          <td className="px-2 py-1.5 text-center font-semibold border border-primary/10" style={{color:OLIVE}}>{pct(paintedVal,pos.qty)}%</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-primary/5 border-t-2 border-primary/30">
                      <td className="border border-primary/20" />
                      <td className="px-3 py-1.5 text-center font-bold text-primary border border-primary/20">ИТОГО</td>
                      <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{colorQty}</td>
                      <td className="px-2 py-1.5 text-center font-bold text-primary/50 border border-primary/20">—</td>
                      <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{colorPainted}</td>
                      <td className="px-2 py-1.5 text-center font-bold text-primary border border-primary/20">{colorQty-colorPainted}</td>
                      <td className="px-2 py-1.5 text-center font-bold border border-primary/20" style={{color:OLIVE}}>{pct(colorPainted,colorQty)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AdminPainting = () => {
  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<PaintFilter>('working'); // по умолчанию «В работе»
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [fullOrder, setFullOrder]   = useState<Order | null>(null);

  const load = async () => {
    const res  = await fetch(urls['orders']);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updatePainted = async (id: number, painted: Record<string, number>) => {
    setOrders(prev => prev.map(o => o.id===id?{...o,painted}:o));
    await fetch(urls['orders'],{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,painted})});
  };
  const updateStage = async (id: number, stage: string) => {
    setOrders(prev => prev.map(o => o.id===id?{...o,stage}:o));
    if (fullOrder?.id===id) setFullOrder(prev => prev?{...prev,stage}:prev);
    await fetch(urls['orders'],{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,stage})});
  };

  const allPainting = orders.filter(o => PAINTING_STAGES.includes(o.stage) && !o.is_archived && !o.is_trashed);

  // Плетутся — заказы на этапе «Плетение»
  const weavingOrders = allPainting.filter(o => o.stage === 'Плетение');
  // В работе — заказы на этапе «Малярка»
  const workingOrders = allPainting.filter(o => o.stage === 'Малярка');
  // Выполнены — покраска 100% (не в очереди и не на плетении)
  const doneOrders    = allPainting.filter(o => {
    if (o.stage === 'В очереди на плетение' || o.stage === 'Плетение') return false;
    const byColor = groupByColor(o.items);
    let totalQ=0, totalP=0;
    for (const [,positions] of Array.from(byColor.entries())) {
      for (const pos of positions) { totalQ+=pos.qty; totalP+=Math.min((o.painted||{})[pos.posKey]||0,pos.qty); }
    }
    return totalQ>0 && totalP>=totalQ;
  });

  const visibleOrders = filter === 'weaving' ? weavingOrders : filter === 'working' ? workingOrders : doneOrders;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <h1 className="font-display text-2xl font-semibold text-primary">Малярка</h1>
        <div className="flex gap-2 flex-wrap">
          {([
            ['weaving', 'Плетутся',  weavingOrders.length],
            ['working', 'В работе',  workingOrders.length],
            ['done',    'Выполнены', doneOrders.length],
          ] as [PaintFilter, string, number][]).map(([key, label, count]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${filter===key?'bg-primary text-white border-primary':'border-primary/40 text-primary hover:border-primary'}`}>
              {label}
              {count > 0 && <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter===key?'bg-white/30':'bg-primary/10'}`}>{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Кнопки-цвета */}
      <div className="flex flex-wrap gap-2 mb-5">
        {PAINT_COLORS.map(c => (
          <button key={c.name} onClick={() => setColorFilter(colorFilter===c.name?null:c.name)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all ${colorFilter===c.name?'border-primary/70 shadow-md scale-105':'border-transparent'}`}
            style={{backgroundColor:c.hex,color:'#3a2a1a'}}>
            {c.name.slice(0,6)}
          </button>
        ))}
        {colorFilter && (
          <button onClick={() => setColorFilter(null)} className="px-3 py-1.5 rounded-xl text-sm text-muted-foreground border border-border hover:border-primary transition-colors">
            Сбросить
          </button>
        )}
      </div>

      {loading ? <p className="text-muted-foreground">Загружаю...</p> :
       visibleOrders.length===0 ? <p className="text-muted-foreground">Нет заказов.</p> : (
        <div className="space-y-5 max-w-5xl">
          {visibleOrders.map(order => (
            <PaintingCard key={order.id} order={order} colorFilter={colorFilter}
              onUpdatePainted={updatePainted} onUpdateStage={updateStage} onOpenFull={setFullOrder} />
          ))}
        </div>
       )}

      {fullOrder && (
        <OrderFullCard order={fullOrder} onClose={() => setFullOrder(null)}
          onUpdate={(id,patch) => {
            setOrders(p=>p.map(o=>o.id===id?{...o,...patch}:o));
            setFullOrder(p=>p?{...p,...patch}:p);
            fetch(urls['orders'],{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...patch})});
          }}
          onOpenClient={() => window.open('/admin/clients', '_blank')}
        />
      )}
    </div>
  );
};

export default AdminPainting;
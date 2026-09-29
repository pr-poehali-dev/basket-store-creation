import { useState, useEffect, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';
import { STAGES, Order, RESPONSIBLES, DELIVERY_LABELS, fmtMoney } from './orderUtils';

interface Product { id: number; name: string; size: string; color: string; price: number; }
interface Client  { id: number; callsign: string; full_name: string; phone: string; city: string; }
interface Line    { key: string; name: string; size: string; color: string; price: number; qty: number; }

const EMPTY = {
  order_number: '', stage: 'Новый заказ', city: '', customer_name: '', phone: '',
  customer_email: '', discount: 0, responsible: '', due_date: '',
  delivery_type: '', delivery_address: '', payment_method: '', comment: '',
};

const AdminOrderBuilder = () => {
  const [mode, setMode]         = useState<'new' | 'edit'>('new');
  const [orders, setOrders]     = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState('');

  const [editId, setEditId] = useState<number | null>(null);
  const [head, setHead]     = useState({ ...EMPTY });
  const [lines, setLines]   = useState<Line[]>([]);

  const [search, setSearch]     = useState('');
  const [prodSearch, setProdSearch] = useState('');

  const load = async () => {
    const [o, p, c] = await Promise.all([
      fetch(urls['orders']).then(r => r.json()),
      fetch(`${urls['products']}?raw=1`).then(r => r.json()),
      fetch(urls['clients']).then(r => r.json()),
    ]);
    setOrders((o.orders || []).filter((x: Order) => !x.is_trashed));
    setProducts(p.products || []);
    setClients(c.clients || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const total = useMemo(
    () => Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * (1 - (head.discount || 0) / 100)),
    [lines, head.discount]);

  const startNew = () => {
    setMode('new'); setEditId(null);
    setHead({ ...EMPTY, order_number: String(Date.now()).slice(-5) });
    setLines([]); setSaved('');
  };

  const startEdit = (o: Order) => {
    setMode('edit'); setEditId(o.id); setSaved('');
    setHead({
      order_number: o.order_number || '', stage: o.stage, city: o.city || '',
      customer_name: o.customer_name || '', phone: o.customer_phone || '',
      customer_email: o.customer_email || '', discount: o.discount || 0,
      responsible: o.responsible || '', due_date: o.due_date || '',
      delivery_type: o.delivery_type || '', delivery_address: o.delivery_address || '',
      payment_method: o.payment_method || '', comment: o.comment || '',
    });
    setLines((o.items || []).map((it, i) => ({
      key: `l${i}`, name: it.name, size: it.size || '', color: it.color || '',
      price: (it as { price?: number }).price || 0, qty: it.qty,
    })));
  };

  const addProduct = (p: Product) => setLines(prev => [...prev, {
    key: `l${Date.now()}${prev.length}`, name: p.name, size: p.size || '',
    color: p.color || '', price: p.price || 0, qty: 1,
  }]);

  const addBlank = () => setLines(prev => [...prev, {
    key: `l${Date.now()}${prev.length}`, name: '', size: '', color: '', price: 0, qty: 1,
  }]);

  const setLine = (key: string, patch: Partial<Line>) =>
    setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l));
  const delLine = (key: string) => setLines(prev => prev.filter(l => l.key !== key));

  const pickClient = (c: Client) => setHead(h => ({
    ...h, customer_name: c.full_name || c.callsign, phone: c.phone || '', city: c.city || h.city,
  }));

  const save = async () => {
    if (!head.customer_name.trim()) { alert('Укажите клиента'); return; }
    if (lines.length === 0) { alert('Добавьте хотя бы одну позицию'); return; }
    setSaving(true);
    const payload = {
      ...head, total,
      items: lines.map(l => ({ name: l.name, size: l.size, color: l.color, qty: l.qty, price: l.price })),
    };
    if (mode === 'edit' && editId) {
      await fetch(urls['orders'], {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, ...payload }),
      });
      setSaved('Заказ обновлён');
    } else {
      await fetch(urls['orders'], {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSaved('Заказ создан');
    }
    setSaving(false);
    await load();
    if (mode === 'new') startNew();
  };

  const foundOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? orders.filter(o =>
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.city || '').toLowerCase().includes(q) ||
      (o.order_number || '').toLowerCase().includes(q)) : orders;
    return list.slice(0, 40);
  }, [orders, search]);

  const foundProducts = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products.filter(p => `${p.name} ${p.size}`.toLowerCase().includes(q)).slice(0, 20);
  }, [products, prodSearch]);

  const inp = 'w-full border border-primary/25 rounded-xl px-3 py-2 text-sm bg-background text-primary outline-none focus:border-accent';
  const lbl = 'text-[11px] text-primary/50 block mb-1';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-display text-2xl font-semibold text-primary">Конструктор заказов</h1>
        <div className="flex gap-2">
          <button onClick={startNew}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              mode === 'new' ? 'bg-primary text-white' : 'border border-primary/30 text-primary hover:border-primary'}`}>
            <Icon name="Plus" size={15} /> Новый заказ
          </button>
          <button onClick={() => { setMode('edit'); setSaved(''); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              mode === 'edit' ? 'bg-primary text-white' : 'border border-primary/30 text-primary hover:border-primary'}`}>
            <Icon name="Pencil" size={15} /> Редактировать
          </button>
        </div>
      </div>

      {saved && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-accent/12 text-accent text-sm font-semibold flex items-center gap-2">
          <Icon name="Check" size={15} /> {saved}
        </div>
      )}

      {loading ? <p className="text-muted-foreground">Загружаю...</p> : (
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">

          {/* Левая колонка: поиск заказа для редактирования */}
          {mode === 'edit' && (
            <div className="border border-primary/20 rounded-2xl p-4 h-fit lg:sticky lg:top-4">
              <div className="text-sm font-semibold text-primary mb-2">Выберите заказ</div>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Номер / клиент / город..." className={inp + ' mb-3'} />
              <div className="max-h-[60vh] overflow-y-auto space-y-1.5">
                {foundOrders.map(o => (
                  <button key={o.id} onClick={() => startEdit(o)}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${
                      editId === o.id ? 'border-primary bg-primary/6' : 'border-primary/15 hover:border-primary/45'}`}>
                    <div className="text-[10px] uppercase tracking-wide text-primary/40 font-semibold">
                      {o.city || 'Город не указан'}
                    </div>
                    <div className="text-sm font-semibold text-primary truncate">{o.customer_name}</div>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-[11px] text-primary/45">#{o.order_number}</span>
                      <span className="text-[11px] font-bold text-primary tabular-nums">{fmtMoney(o.total)}</span>
                    </div>
                  </button>
                ))}
                {foundOrders.length === 0 && <p className="text-xs text-muted-foreground py-3">Ничего не найдено</p>}
              </div>
            </div>
          )}

          {/* Правая колонка: форма */}
          <div className={mode === 'new' ? 'lg:col-span-2 max-w-4xl' : ''}>
            {mode === 'edit' && !editId ? (
              <div className="border border-dashed border-primary/25 rounded-2xl p-10 text-center text-muted-foreground">
                Выберите заказ слева, чтобы отредактировать
              </div>
            ) : (
              <div className="space-y-5">

                {/* Клиент */}
                <div className="border border-primary/20 rounded-2xl p-5">
                  <div className="text-sm font-semibold text-primary mb-3">Клиент и доставка</div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className={lbl}>Город</label>
                      <input value={head.city} onChange={e => setHead(h => ({ ...h, city: e.target.value }))} className={inp} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={lbl}>Клиент</label>
                      <input list="clients-dl" value={head.customer_name}
                        onChange={e => {
                          const v = e.target.value;
                          const c = clients.find(x => (x.full_name || x.callsign) === v);
                          if (c) pickClient(c); else setHead(h => ({ ...h, customer_name: v }));
                        }}
                        placeholder="Имя или позывной" className={inp} />
                      <datalist id="clients-dl">
                        {clients.map(c => <option key={c.id} value={c.full_name || c.callsign} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className={lbl}>Телефон</label>
                      <input value={head.phone} onChange={e => setHead(h => ({ ...h, phone: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Доставка</label>
                      <select value={head.delivery_type} onChange={e => setHead(h => ({ ...h, delivery_type: e.target.value }))} className={inp}>
                        <option value="">—</option>
                        {Object.entries(DELIVERY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Адрес доставки</label>
                      <input value={head.delivery_address} onChange={e => setHead(h => ({ ...h, delivery_address: e.target.value }))} className={inp} />
                    </div>
                  </div>
                </div>

                {/* Параметры заказа */}
                <div className="border border-primary/20 rounded-2xl p-5">
                  <div className="text-sm font-semibold text-primary mb-3">Параметры заказа</div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <label className={lbl}>Номер</label>
                      <input value={head.order_number} onChange={e => setHead(h => ({ ...h, order_number: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Этап</label>
                      <select value={head.stage} onChange={e => setHead(h => ({ ...h, stage: e.target.value }))} className={inp}>
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Ответственный</label>
                      <select value={head.responsible} onChange={e => setHead(h => ({ ...h, responsible: e.target.value }))} className={inp}>
                        <option value="">—</option>
                        {RESPONSIBLES.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Дата готовности</label>
                      <input type="date" value={head.due_date} onChange={e => setHead(h => ({ ...h, due_date: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Скидка, %</label>
                      <input type="number" min={0} max={100} value={head.discount || ''}
                        onChange={e => setHead(h => ({ ...h, discount: parseInt(e.target.value) || 0 }))} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Оплата</label>
                      <input value={head.payment_method} onChange={e => setHead(h => ({ ...h, payment_method: e.target.value }))} className={inp} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={lbl}>Комментарий</label>
                      <input value={head.comment} onChange={e => setHead(h => ({ ...h, comment: e.target.value }))} className={inp} />
                    </div>
                  </div>
                </div>

                {/* Позиции */}
                <div className="border border-primary/20 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                    <div className="text-sm font-semibold text-primary">Позиции заказа</div>
                    <div className="flex gap-2 items-center">
                      <input value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                        placeholder="Поиск товара..." className="border border-primary/25 rounded-xl px-3 py-1.5 text-sm bg-background outline-none focus:border-accent w-48" />
                      <button onClick={addBlank}
                        className="text-xs px-3 py-1.5 rounded-xl border border-primary/30 text-primary hover:border-primary transition-colors">
                        + Своя позиция
                      </button>
                    </div>
                  </div>

                  {prodSearch && (
                    <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-primary/10">
                      {foundProducts.map(p => (
                        <button key={p.id} onClick={() => { addProduct(p); setProdSearch(''); }}
                          className="text-xs px-2.5 py-1.5 rounded-xl border border-primary/20 text-primary hover:border-primary hover:bg-primary/5 transition-colors">
                          {p.name}{p.size ? ` (${p.size})` : ''} · {fmtMoney(p.price)}
                        </button>
                      ))}
                      {foundProducts.length === 0 && <span className="text-xs text-muted-foreground">Не найдено</span>}
                    </div>
                  )}

                  {lines.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Позиции не добавлены</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="hidden sm:grid grid-cols-[1fr_120px_130px_70px_100px_32px] gap-2 text-[10px] uppercase tracking-wide text-primary/40 font-semibold px-1">
                        <span>Позиция</span><span>Размер</span><span>Цвет</span><span>Кол-во</span><span>Цена</span><span />
                      </div>
                      {lines.map(l => (
                        <div key={l.key} className="grid gap-2 sm:grid-cols-[1fr_120px_130px_70px_100px_32px] items-center">
                          <input value={l.name} onChange={e => setLine(l.key, { name: e.target.value })}
                            placeholder="Название" className={inp} />
                          <input value={l.size} onChange={e => setLine(l.key, { size: e.target.value })}
                            placeholder="Размер" className={inp} />
                          <input value={l.color} onChange={e => setLine(l.key, { color: e.target.value })}
                            placeholder="Цвет" className={inp} />
                          <input type="number" min={1} value={l.qty}
                            onChange={e => setLine(l.key, { qty: parseInt(e.target.value) || 1 })} className={inp + ' text-center'} />
                          <input type="number" min={0} value={l.price}
                            onChange={e => setLine(l.key, { price: parseFloat(e.target.value) || 0 })} className={inp + ' text-right'} />
                          <button onClick={() => delLine(l.key)}
                            className="text-primary/35 hover:text-red-500 transition-colors flex justify-center">
                            <Icon name="Trash2" size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end items-center gap-6 mt-4 pt-3 border-t border-primary/15">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-primary/40 font-semibold">Позиций</div>
                      <div className="font-bold text-primary tabular-nums">{lines.reduce((s, l) => s + l.qty, 0)} шт</div>
                    </div>
                    {head.discount > 0 && (
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wide text-primary/40 font-semibold">Скидка</div>
                        <div className="font-bold text-accent tabular-nums">{head.discount}%</div>
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-primary/40 font-semibold">Итого</div>
                      <div className="font-bold text-primary text-xl tabular-nums">{fmtMoney(total)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={save} disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                    {saving ? 'Сохраняю...' : mode === 'edit' ? 'Сохранить изменения' : 'Создать заказ'}
                  </button>
                  {mode === 'new' && (
                    <button onClick={startNew}
                      className="px-5 py-2.5 rounded-xl border border-primary/30 text-primary text-sm font-semibold hover:border-primary transition-colors">
                      Очистить
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderBuilder;

import { useState, useEffect, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';
import { STAGES, Order, RESPONSIBLES, DELIVERY_LABELS, fmtMoney } from './orderUtils';
import { WHOLESALE_TIERS } from '../PriceTiers';
import { ClientForm, emptyForm } from './AdminClients';

const PAYMENTS = ['По счёту', 'QR-код'];

interface Product { id: number; name: string; size: string; color: string; price: number; }
interface Client  { id: number; callsign: string; full_name: string; phone: string; city: string; email: string; delivery_address: string; delivery_type: string; payment_method: string; }
interface Line    { key: string; name: string; color: string; base: number; price: number; qty: number; manual?: boolean; }
interface Catalog { name: string; price: number; colors: string[]; }

const EMPTY = {
  order_number: '', stage: 'Новый заказ', city: '', customer_name: '', phone: '',
  customer_email: '', responsible: '', due_date: '',
  delivery_type: '', delivery_address: '', payment_method: '', comment: '',
};

const round = (n: number) => Math.round(n);

const Section = ({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) => (
  <div className="border border-primary/20 rounded-2xl overflow-hidden">
    <button onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-primary/5 transition-colors">
      <span className="text-sm font-semibold text-primary">{title}</span>
      <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-primary/45" />
    </button>
    {open && <div className="px-5 pb-5">{children}</div>}
  </div>
);

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

  const [openClient, setOpenClient] = useState(true);
  const [openParams, setOpenParams] = useState(true);

  const [search, setSearch]         = useState('');
  const [prodSearch, setProdSearch] = useState('');
  const [prodOpen, setProdOpen]     = useState(false);
  const [cliSearch, setCliSearch]   = useState('');
  const [cliOpen, setCliOpen]       = useState(false);
  const [autoWholesale, setAutoWholesale] = useState(true);
  const [openPicker, setOpenPicker] = useState(true);
  const [newClient, setNewClient]   = useState<(ReturnType<typeof emptyForm> & { id?: number }) | null>(null);

  const calcNext = (list: Order[]) => {
    const max = list.reduce((m, o) => {
      const n = parseInt(String(o.order_number || '').replace(/\D/g, ''), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return String(max + 1);
  };

  const load = async () => {
    const [o, p, c] = await Promise.all([
      fetch(urls['orders']).then(r => r.json()),
      fetch(`${urls['products']}?raw=1`).then(r => r.json()),
      fetch(urls['clients']).then(r => r.json()),
    ]);
    const ords = (o.orders || [])
      .filter((x: Order) => !x.is_trashed)
      .sort((a: Order, b: Order) =>
        String(b.created_at || '').localeCompare(String(a.created_at || '')) || b.id - a.id);
    setOrders(ords);
    setProducts(p.products || []);
    setClients(c.clients || []);
    setLoading(false);
    return ords as Order[];
  };

  useEffect(() => {
    load().then(ords => setHead(h => ({ ...h, order_number: calcNext(ords) })));
  }, []);

  const clientList = useMemo(() => {
    const seen = new Set<string>();
    return clients
      .map(c => ({ ...c, tag: (c.callsign || c.full_name || '').trim() }))
      .filter(c => { if (!c.tag || seen.has(c.tag)) return false; seen.add(c.tag); return true; })
      .sort((a, b) => a.tag.localeCompare(b.tag, 'ru'));
  }, [clients]);

  const catalog = useMemo<Catalog[]>(() => {
    const map = new Map<string, { price: number; colors: Set<string> }>();
    for (const p of products) {
      const name = (p.name || '').trim();
      if (!name) continue;
      const e = map.get(name) || { price: p.price || 0, colors: new Set<string>() };
      if (p.price && (!e.price || p.price < e.price)) e.price = p.price;
      if (p.color) String(p.color).split(/[,/]/).forEach(c => { if (c.trim()) e.colors.add(c.trim()); });
      map.set(name, e);
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, price: v.price, colors: [...v.colors].sort((a, b) => a.localeCompare(b, 'ru')) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [products]);

  const colorsFor = (name: string) => catalog.find(c => c.name === name)?.colors || [];

  const allColors = useMemo(() => {
    const s = new Set<string>();
    catalog.forEach(c => c.colors.forEach(x => s.add(x)));
    return [...s].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [catalog]);

  const total = useMemo(() => Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0)), [lines]);

  // Оптовая скидка как в корзине: считаем от суммы по базовым ценам
  const baseSum = useMemo(() => lines.reduce((s, l) => s + l.base * l.qty, 0), [lines]);
  const autoPct = useMemo(() => {
    let pct = 0;
    for (const t of WHOLESALE_TIERS) if (baseSum >= t.threshold) pct = Math.max(pct, t.pct);
    return pct;
  }, [baseSum]);

  useEffect(() => {
    if (!autoWholesale) return;
    setLines(prev => {
      let changed = false;
      const next = prev.map(l => {
        if (l.manual || l.base <= 0) return l;
        const want = round(l.base * (1 - autoPct / 100));
        if (want === l.price) return l;
        changed = true;
        return { ...l, price: want };
      });
      return changed ? next : prev;
    });
  }, [autoPct, autoWholesale]);

  const startNew = () => {
    setMode('new'); setEditId(null); setSaved('');
    setHead({ ...EMPTY, order_number: calcNext(orders) });
    setLines([]);
  };

  const startEdit = (o: Order) => {
    setMode('edit'); setEditId(o.id); setSaved('');
    setHead({
      order_number: o.order_number || '', stage: o.stage, city: o.city || '',
      customer_name: o.customer_name || '', phone: o.customer_phone || '',
      customer_email: o.customer_email || '',
      responsible: o.responsible || '', due_date: o.due_date || '',
      delivery_type: o.delivery_type || '', delivery_address: o.delivery_address || '',
      payment_method: o.payment_method || '',
      comment: /Импорт из таблицы/i.test(o.comment || '') ? '' : (o.comment || ''),
    });
    setLines((o.items || []).map((it, i) => {
      const price = (it as { price?: number }).price || 0;
      const base  = catalog.find(c => c.name === it.name)?.price || price;
      return { key: `l${i}`, name: it.name, color: it.color || '', base, price, qty: it.qty };
    }));
  };

  const addItem = (c: Catalog) => setLines(prev => [...prev, {
    key: `l${Date.now()}${prev.length}`, name: c.name,
    color: c.colors[0] || '', base: c.price, price: c.price, qty: 1,
  }]);

  const addBlank = () => setLines(prev => [...prev, {
    key: `l${Date.now()}${prev.length}`, name: '', color: '', base: 0, price: 0, qty: 1,
  }]);

  const setLine = (key: string, patch: Partial<Line>) =>
    setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l));

  const changePrice = (l: Line, price: number) => {
    // Для своей позиции (нет базовой цены из каталога) введённая цена
    // становится розничной базой — тогда оптовая скидка применится к ней
    if (l.base <= 0) {
      const p = round(price);
      setLine(l.key, { base: p, price: autoWholesale ? round(p * (1 - autoPct / 100)) : p });
      return;
    }
    setLine(l.key, { price: round(price), manual: true });
  };

  const changeDiscount = (l: Line, disc: number) => {
    const d = Math.min(100, Math.max(0, disc));
    setLine(l.key, { price: round(l.base * (1 - d / 100)), manual: true });
  };

  const changeName = (l: Line, name: string) => {
    const c = catalog.find(x => x.name === name);
    if (c) setLine(l.key, { name, base: c.price, price: c.price, color: l.color || c.colors[0] || '' });
    else setLine(l.key, { name });
  };

  const discOf = (l: Line) => l.base > 0 ? Math.round((1 - l.price / l.base) * 100) : 0;

  const delLine = (key: string) => setLines(prev => prev.filter(l => l.key !== key));

  const pickClient = (tag: string) => {
    const c = clientList.find(x => x.tag === tag);
    if (!c) { setHead(h => ({ ...h, customer_name: tag })); return; }
    setHead(h => ({
      ...h, customer_name: c.tag, phone: c.phone || '', city: c.city || '',
      customer_email: c.email || h.customer_email,
      delivery_address: c.delivery_address || h.delivery_address,
      delivery_type: c.delivery_type || h.delivery_type,
      payment_method: c.payment_method || h.payment_method,
    }));
  };

  const save = async () => {
    if (!head.customer_name.trim()) { alert('Выберите клиента'); return; }
    if (lines.length === 0) { alert('Добавьте хотя бы одну позицию'); return; }
    setSaving(true);
    const payload = {
      ...head, total,
      items: lines.map(l => ({ name: l.name, color: l.color, qty: l.qty, price: l.price })),
    };
    if (mode === 'edit' && editId) {
      await fetch(urls['orders'], {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, ...payload }),
      });
      setSaved('Заказ обновлён');
      await load();
    } else {
      await fetch(urls['orders'], {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSaved('Заказ создан');
      const ords = await load();
      setEditId(null);
      setLines([]);
      setHead({ ...EMPTY, order_number: calcNext(ords) });
    }
    setSaving(false);
  };

  const foundOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? orders.filter(o =>
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.city || '').toLowerCase().includes(q) ||
      (o.order_number || '').toLowerCase().includes(q)) : orders;
    return list;
  }, [orders, search]);

  const foundClients = useMemo(() => {
    const q = cliSearch.trim().toLowerCase();
    const list = q ? clientList.filter(c =>
      c.tag.toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q)) : clientList;
    return list.slice(0, 60);
  }, [clientList, cliSearch]);

  const foundItems = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(c => c.name.toLowerCase().includes(q));
  }, [catalog, prodSearch]);

  const inp = 'w-full h-10 border border-primary/25 rounded-xl px-3 text-sm bg-background text-primary outline-none focus:border-accent appearance-none';
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
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-accent/10 text-accent text-sm font-semibold flex items-center gap-2">
          <Icon name="Check" size={15} /> {saved}
        </div>
      )}

      {loading ? <p className="text-muted-foreground">Загружаю...</p> : (
        <div className={mode === 'edit' ? 'grid gap-5 lg:grid-cols-[340px_1fr]' : ''}>

          {mode === 'edit' && (
            <div className="border border-primary/20 rounded-2xl h-fit lg:sticky lg:top-4 overflow-hidden">
              <button onClick={() => setOpenPicker(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-primary/5 transition-colors">
                <span className="text-sm font-semibold text-primary">Выберите заказ</span>
                <Icon name={openPicker ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-primary/45" />
              </button>
              {openPicker && <div className="px-4 pb-4">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Номер / клиент / город..." className={inp + ' mb-3'} />
              <div className="max-h-[60vh] overflow-y-auto space-y-1.5">
                {foundOrders.map(o => (
                  <button key={o.id} onClick={() => startEdit(o)}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${
                      editId === o.id ? 'border-primary bg-primary/5' : 'border-primary/15 hover:border-primary/45'}`}>
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
              </div>}
            </div>
          )}

          <div className={mode === 'new' ? 'max-w-5xl' : ''}>
            {mode === 'edit' && !editId ? (
              <div className="border border-dashed border-primary/25 rounded-2xl p-10 text-center text-muted-foreground">
                Выберите заказ слева, чтобы отредактировать
              </div>
            ) : (
              <div className="space-y-4">

                <Section title="Клиент и доставка" open={openClient} onToggle={() => setOpenClient(v => !v)}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2 relative">
                      <label className={lbl}>Клиент (позывной)</label>
                      <input
                        value={cliOpen ? cliSearch : (head.customer_name || '')}
                        onFocus={() => { setCliOpen(true); setCliSearch(''); }}
                        onChange={e => { setCliSearch(e.target.value); setCliOpen(true); }}
                        onBlur={() => setTimeout(() => setCliOpen(false), 150)}
                        placeholder="Начните вводить позывной..." className={inp} />
                      <button type="button" onClick={() => setNewClient(emptyForm())}
                        className="absolute right-2 top-[26px] h-7 px-2.5 rounded-lg bg-primary text-white text-[11px] font-semibold hover:opacity-90">
                        + Клиент
                      </button>
                      {cliOpen && (
                        <div className="absolute z-20 left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-background border border-primary/25 rounded-xl shadow-lg">
                          {foundClients.length === 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground">Клиент не найден</div>
                          )}
                          {foundClients.map(c => (
                            <button key={c.id} type="button"
                              onMouseDown={() => { pickClient(c.tag); setCliOpen(false); }}
                              className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/8 transition-colors">
                              {c.tag}
                              {c.city && <span className="text-primary/40 text-xs"> · {c.city}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className={lbl}>Город</label>
                      <input value={head.city} onChange={e => setHead(h => ({ ...h, city: e.target.value }))} className={inp} />
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
                </Section>

                <Section title="Параметры заказа" open={openParams} onToggle={() => setOpenParams(v => !v)}>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <label className={lbl}>Номер (авто)</label>
                      <input value={head.order_number} readOnly
                        className={inp + ' bg-primary/5 text-primary/60 cursor-not-allowed'} />
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
                      <label className={lbl}>Оплата</label>
                      <select value={head.payment_method} onChange={e => setHead(h => ({ ...h, payment_method: e.target.value }))} className={inp}>
                        <option value="">—</option>
                        {PAYMENTS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className={lbl}>Комментарий</label>
                      <input value={head.comment} onChange={e => setHead(h => ({ ...h, comment: e.target.value }))} className={inp} />
                    </div>
                  </div>
                </Section>

                <div className="border border-primary/20 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                    <div className="text-sm font-semibold text-primary">Позиции заказа</div>
                    <div className="flex gap-2 items-center">
                      <div className="relative">
                        <input value={prodSearch}
                          onFocus={() => setProdOpen(true)}
                          onBlur={() => setTimeout(() => setProdOpen(false), 150)}
                          onChange={e => { setProdSearch(e.target.value); setProdOpen(true); }}
                          placeholder="Поиск позиции..." className="h-10 border border-primary/25 rounded-xl px-3 text-sm bg-background outline-none focus:border-accent w-56" />
                        {prodOpen && (
                          <div className="absolute z-20 left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto bg-background border border-primary/25 rounded-xl shadow-lg w-72">
                            {foundItems.length === 0 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground">Не найдено</div>
                            )}
                            {foundItems.map(c => (
                              <button key={c.name} type="button"
                                onMouseDown={() => { addItem(c); setProdSearch(''); setProdOpen(false); }}
                                className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/8 transition-colors">
                                {c.name} <span className="text-primary/45">({Math.round(c.price)}р)</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={addBlank}
                        className="text-xs h-10 px-3 rounded-xl border border-primary/30 text-primary hover:border-primary transition-colors whitespace-nowrap">
                        + Своя позиция
                      </button>
                    </div>
                  </div>

                  <datalist id="colors-all">
                    {allColors.map(c => <option key={c} value={c} />)}
                  </datalist>
                  <datalist id="names-all">
                    {catalog.map(c => <option key={c.name} value={c.name} />)}
                  </datalist>

                  {lines.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Позиции не добавлены</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="hidden sm:grid grid-cols-[1fr_150px_70px_110px_100px_32px] gap-2 text-[10px] uppercase tracking-wide text-primary/40 font-semibold px-1">
                        <span>Позиция</span><span>Цвет</span><span>Кол-во</span><span>Цена со скидкой</span><span>Скидка, %</span><span />
                      </div>
                      {lines.map(l => (
                        <div key={l.key} className="grid gap-2 sm:grid-cols-[1fr_150px_70px_110px_100px_32px] items-center">
                          <input list="names-all" value={l.name} onChange={e => changeName(l, e.target.value)}
                            placeholder="Название" className={inp} />
                          <input list={`colors-${l.key}`} value={l.color}
                            onChange={e => setLine(l.key, { color: e.target.value })}
                            placeholder="Цвет" className={inp} />
                          <datalist id={`colors-${l.key}`}>
                            {(colorsFor(l.name).length ? colorsFor(l.name) : allColors).map(c => <option key={c} value={c} />)}
                          </datalist>
                          <input type="number" min={1} value={l.qty}
                            onChange={e => setLine(l.key, { qty: parseInt(e.target.value) || 1 })} className={inp + ' text-center'} />
                          <input type="number" min={0} value={l.price}
                            onChange={e => changePrice(l, parseFloat(e.target.value) || 0)} className={inp + ' text-right font-semibold'} />
                          <input type="number" min={0} max={100} value={discOf(l)}
                            onChange={e => changeDiscount(l, parseFloat(e.target.value) || 0)}
                            className={inp + ' text-right'} />
                          <button onClick={() => delLine(l.key)}
                            className="text-primary/35 hover:text-red-500 transition-colors flex justify-center">
                            <Icon name="Trash2" size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center gap-6 mt-4 pt-3 border-t border-primary/15 flex-wrap">
                    <label className="flex items-center gap-2 text-xs text-primary/70 cursor-pointer">
                      <input type="checkbox" checked={autoWholesale}
                        onChange={e => setAutoWholesale(e.target.checked)} className="accent-primary" />
                      Оптовая скидка автоматически
                      {autoPct > 0 && <span className="font-bold text-accent">−{autoPct}%</span>}
                    </label>
                    <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-primary/40 font-semibold">Позиций</div>
                      <div className="font-bold text-primary tabular-nums">{lines.reduce((s, l) => s + l.qty, 0)} шт</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-primary/40 font-semibold">Итого</div>
                      <div className="font-bold text-primary text-xl tabular-nums">{fmtMoney(total)}</div>
                    </div>
                    </div>
                    {baseSum > total && (
                      <div className="w-full flex justify-end gap-6 text-xs text-primary/60">
                        <span>Розничная сумма: <b className="tabular-nums">{fmtMoney(baseSum)}</b></span>
                        <span className="text-accent font-semibold">
                          Скидка: −{fmtMoney(baseSum - total)} ({Math.round((1 - total / baseSum) * 100)}%)
                        </span>
                      </div>
                    )}
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

      {newClient && (
        <ClientForm
          initial={newClient}
          onClose={() => setNewClient(null)}
          onSave={async data => {
            await fetch(urls['clients'], {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'client', ...data }),
            });
            setNewClient(null);
            const res = await fetch(urls['clients']).then(r => r.json());
            setClients(res.clients || []);
            const tag = (data.callsign || data.full_name || '').trim();
            setHead(h => ({
              ...h, customer_name: tag, phone: data.phone || '', city: data.city || '',
              customer_email: data.email || '', delivery_address: data.delivery_address || '',
              delivery_type: data.delivery_type || '', payment_method: data.payment_method || h.payment_method,
            }));
          }}
        />
      )}
    </div>
  );
};

export default AdminOrderBuilder;

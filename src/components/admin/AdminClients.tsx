import { useState, useEffect, useRef } from 'react';
import urls from '../../../backend/func2url.json';

interface Client {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  city: string;
  inn: string;
  delivery_days: string;
  delivery_time: string;
  payment_method: string;
  delivery_address: string;
  delivery_type: string;
  order_count: number;
  total_sum: number;
  created_at: string;
}

interface OrderItem { name: string; size: string; color: string; qty: number; }
interface ClientOrder {
  id: number; order_number: string; stage: string; city: string;
  customer_name: string; total: number; discount: number;
  items: OrderItem[]; created_at: string; due_date: string; notes: string;
}

function fmtMoney(n: number) { return n.toLocaleString('ru-RU') + ' ₽'; }
function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const emptyForm = () => ({
  full_name: '', phone: '', email: '', city: '',
  inn: '', delivery_days: '', delivery_time: '',
  payment_method: '', delivery_address: '', delivery_type: '',
});

const ClientCard = ({ client, onDelete, onEdit }: {
  client: Client;
  onDelete: (id: number) => void;
  onEdit: (c: Client) => void;
}) => {
  const [expanded, setExpanded]       = useState(false);
  const [orders, setOrders]           = useState<ClientOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const loadOrders = async () => {
    if (orders.length > 0) { setExpanded(v => !v); return; }
    setLoadingOrders(true);
    try {
      const res  = await fetch(`${urls['clients']}?id=${client.id}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch { /* ignore */ }
    setLoadingOrders(false);
    setExpanded(true);
  };

  const hasDelivery = client.delivery_address || client.delivery_days || client.delivery_time || client.delivery_type;

  return (
    <div className="border border-primary/25 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary/3 transition-colors" onClick={loadOrders}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-primary">{client.full_name}</span>
            {client.city && <span className="text-sm text-muted-foreground">{client.city}</span>}
            {client.inn && <span className="text-xs text-muted-foreground">ИНН: {client.inn}</span>}
          </div>
          <div className="flex gap-3 mt-1 flex-wrap text-sm text-primary/70">
            {client.phone && <span>📞 {client.phone}</span>}
            {client.email && <span>✉️ {client.email}</span>}
            {client.payment_method && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/8 text-primary">{client.payment_method}</span>}
          </div>
          {hasDelivery && (
            <div className="flex gap-3 mt-1 flex-wrap text-xs text-primary/60">
              {client.delivery_address && <span>📍 {client.delivery_address}</span>}
              {client.delivery_days && <span>📅 {client.delivery_days}</span>}
              {client.delivery_time && <span>🕐 {client.delivery_time}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{client.order_count} {client.order_count === 1 ? 'заказ' : client.order_count < 5 ? 'заказа' : 'заказов'}</div>
            <div className="font-bold text-primary">{fmtMoney(client.total_sum)}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); onEdit(client); }}
            className="text-xs text-primary/60 hover:text-primary px-2 py-1 rounded-lg border border-primary/25 hover:border-primary transition-colors">
            ✎
          </button>
          <button onClick={e => { e.stopPropagation(); if (confirm('Удалить клиента?')) onDelete(client.id); }}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg border border-red-200 hover:border-red-400 transition-colors">
            Удалить
          </button>
          <span className="text-primary/40 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-primary/15 bg-primary/2">
          {loadingOrders ? (
            <p className="text-sm text-muted-foreground p-4">Загружаю...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Заказов нет</p>
          ) : (
            <div className="divide-y divide-primary/10">
              {orders.map(order => (
                <div key={order.id}>
                  <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-muted-foreground">#{order.order_number}</span>
                      <span className="text-sm font-medium text-primary">{fmtDate(order.created_at)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/8 text-primary">{order.stage}</span>
                      {order.discount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">−{order.discount}%</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-primary">{fmtMoney(order.total)}</span>
                      <span className="text-primary/40 text-xs">{expandedOrderId === order.id ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {expandedOrderId === order.id && (
                    <div className="px-4 pb-3">
                      <div className="border border-primary/15 rounded-xl overflow-hidden">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-primary/5 text-xs text-primary/60">
                              <th className="px-3 py-2 text-left font-semibold">Позиция</th>
                              <th className="px-3 py-2 text-left font-semibold">Цвет</th>
                              <th className="px-3 py-2 text-right font-semibold">Кол-во</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(order.items || []).map((item, i) => (
                              <tr key={i} className="border-t border-primary/10">
                                <td className="px-3 py-2 text-primary font-medium">{item.name}{item.size ? ` (${item.size})` : ''}</td>
                                <td className="px-3 py-2 text-primary/70">{item.color || '—'}</td>
                                <td className="px-3 py-2 text-right font-bold text-primary">{item.qty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {order.notes && <p className="text-xs text-primary/60 mt-2 italic">Заметки: {order.notes}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Форма добавления/редактирования ───────────────────────────────────────────
const ClientForm = ({ initial, onSave, onClose }: {
  initial: ReturnType<typeof emptyForm> & { id?: number };
  onSave: (data: ReturnType<typeof emptyForm> & { id?: number }) => void;
  onClose: () => void;
}) => {
  const [f, setF] = useState(initial);
  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-primary/25 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-primary text-lg mb-4">{f.id ? 'Редактировать' : 'Добавить'} клиента</h3>
        <div className="space-y-3">
          {[
            ['full_name', 'Имя / Название'],
            ['phone', 'Телефон *'],
            ['email', 'Email'],
            ['city', 'Город'],
            ['inn', 'ИНН'],
            ['payment_method', 'Способ оплаты'],
            ['delivery_address', 'Адрес доставки'],
            ['delivery_type', 'Вид доставки'],
            ['delivery_days', 'Дни доставки'],
            ['delivery_time', 'Время доставки'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground block mb-1">{label}</label>
              <input value={(f as Record<string,string>)[key] || ''} onChange={e => set(key, e.target.value)}
                className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => f.phone.trim() && onSave(f)}
            className="flex-1 bg-accent text-accent-foreground font-semibold py-2.5 rounded-xl text-sm hover:bg-accent/90">
            Сохранить
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
        </div>
      </div>
    </div>
  );
};

// ── Главный компонент ─────────────────────────────────────────────────────────
const AdminClients = () => {
  const [clients, setClients]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [formData, setFormData] = useState<(ReturnType<typeof emptyForm> & { id?: number }) | null>(null);
  const [syncing, setSyncing]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(urls['clients']);
      const data = await res.json();
      setClients(data.clients || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveClient = async (data: ReturnType<typeof emptyForm> & { id?: number }) => {
    if (data.id) {
      await fetch(urls['clients'], {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.id, ...data }),
      });
    } else {
      await fetch(urls['clients'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'client', ...data }),
      });
    }
    setFormData(null);
    await load();
  };

  const deleteClient = async (id: number) => {
    await fetch(`${urls['clients']}?id=${id}`, { method: 'DELETE' });
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const syncFromOrders = async () => {
    setSyncing(true);
    await fetch(urls['clients'], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sync_from_orders' }),
    });
    setSyncing(false);
    await load();
  };

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg('');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ev.target?.result as ArrayBuffer)));
      const res  = await fetch(urls['clients'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'excel', file: b64 }),
      });
      const data = await res.json();
      setImporting(false);
      setImportMsg(data.error ? `Ошибка: ${data.error}` : `Создано: ${data.created}, обновлено: ${data.updated}`);
      await load();
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const filtered = clients.filter(c =>
    !search ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.city.toLowerCase().includes(search.toLowerCase())
  );

  const totalOrders  = clients.reduce((s, c) => s + c.order_count, 0);
  const totalRevenue = clients.reduce((s, c) => s + c.total_sum, 0);

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="font-display text-2xl font-semibold text-primary mb-1">База клиентов</h1>

      <div className="flex gap-3 mb-5 flex-wrap">
        {[['Клиентов', clients.length],['Заказов', totalOrders],['Доход', totalRevenue.toLocaleString('ru-RU')+' ₽']].map(([l,v]) => (
          <div key={l as string} className="bg-card border border-primary/25 rounded-2xl px-5 py-3">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="text-2xl font-bold text-primary">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени, телефону или городу..."
          className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent flex-1 min-w-[200px]" />
        <button onClick={() => setFormData(emptyForm())}
          className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90">
          + Добавить
        </button>
        <button onClick={syncFromOrders} disabled={syncing}
          className="px-4 py-2 rounded-xl border border-primary/30 text-primary text-sm hover:border-primary disabled:opacity-50">
          {syncing ? 'Синхронизирую...' : '🔄 Из заказов'}
        </button>
        <label className={`px-4 py-2 rounded-xl border border-primary/30 text-primary text-sm cursor-pointer hover:border-primary ${importing ? 'opacity-50' : ''}`}>
          {importing ? 'Загружаю...' : '📥 Excel'}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcel} disabled={importing} />
        </label>
      </div>

      {importMsg && (
        <div className="mb-3 px-4 py-2 rounded-xl text-sm bg-[#f0f4e8] text-[#5a6a2a] border border-[#c8d8b0]">{importMsg}</div>
      )}

      {loading ? <p className="text-muted-foreground">Загружаю...</p> : (
        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-muted-foreground">Клиентов нет</p>}
          {filtered.map(c => (
            <ClientCard key={c.id} client={c} onDelete={deleteClient} onEdit={cl => setFormData({ ...cl })} />
          ))}
        </div>
      )}

      {formData && (
        <ClientForm initial={formData} onSave={saveClient} onClose={() => setFormData(null)} />
      )}
    </div>
  );
};

export default AdminClients;

import { useState, useEffect } from 'react';
import urls from '../../../backend/func2url.json';

interface Client {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  city: string;
  order_count: number;
  total_sum: number;
  created_at: string;
}

interface OrderItem { name: string; size: string; color: string; qty: number; }

interface ClientOrder {
  id: number;
  order_number: string;
  stage: string;
  city: string;
  customer_name: string;
  total: number;
  discount: number;
  items: OrderItem[];
  created_at: string;
  due_date: string;
  notes: string;
}

function fmtMoney(n: number) { return n.toLocaleString('ru-RU') + ' ₽'; }
function fmtDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const ClientCard = ({ client, onDelete }: { client: Client; onDelete: (id: number) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
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

  return (
    <div className="border border-primary/25 rounded-2xl overflow-hidden">
      {/* Шапка клиента */}
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary/3 transition-colors" onClick={loadOrders}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-primary">{client.full_name}</span>
            {client.city && <span className="text-sm text-muted-foreground">{client.city}</span>}
          </div>
          <div className="flex gap-3 mt-1 flex-wrap text-sm text-primary/70">
            {client.phone && <span>📞 {client.phone}</span>}
            {client.email && <span>✉️ {client.email}</span>}
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{client.order_count} {client.order_count === 1 ? 'заказ' : client.order_count < 5 ? 'заказа' : 'заказов'}</div>
            <div className="font-bold text-primary">{fmtMoney(client.total_sum)}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); if (confirm('Удалить клиента?')) onDelete(client.id); }}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg border border-red-200 hover:border-red-400 transition-colors">
            Удалить
          </button>
          <span className="text-primary/40 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* История заказов */}
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
                  {/* Сводка заказа */}
                  <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-muted-foreground">#{order.order_number}</span>
                      <span className="text-sm font-medium text-primary">{fmtDate(order.created_at)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/8 text-primary">{order.stage}</span>
                      {order.discount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">−{order.discount}%</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-primary">{fmtMoney(order.total)}</span>
                      <span className="text-primary/40 text-xs">{expandedOrderId === order.id ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Детали заказа */}
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
                      {order.notes && (
                        <p className="text-xs text-primary/60 mt-2 italic">Заметки: {order.notes}</p>
                      )}
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

const AdminClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', city: '' });
  const [saving, setSaving]   = useState(false);

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

  const addClient = async () => {
    if (!form.phone.trim()) return;
    setSaving(true);
    await fetch(urls['clients'], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'client', ...form }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ full_name: '', phone: '', email: '', city: '' });
    await load();
  };

  const deleteClient = async (id: number) => {
    await fetch(`${urls['clients']}?id=${id}`, { method: 'DELETE' });
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const filtered = clients.filter(c =>
    !search ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.city.toLowerCase().includes(search.toLowerCase())
  );

  const totalOrders = clients.reduce((s, c) => s + c.order_count, 0);
  const totalRevenue = clients.reduce((s, c) => s + c.total_sum, 0);

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="font-display text-2xl font-semibold text-primary mb-1">База клиентов</h1>

      {/* Сводка */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="bg-card border border-primary/25 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Клиентов</div>
          <div className="text-2xl font-bold text-primary">{clients.length}</div>
        </div>
        <div className="bg-card border border-primary/25 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Всего заказов</div>
          <div className="text-2xl font-bold text-primary">{totalOrders}</div>
        </div>
        <div className="bg-card border border-primary/25 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Общая выручка</div>
          <div className="text-2xl font-bold text-primary">{fmtMoney(totalRevenue)}</div>
        </div>
      </div>

      {/* Тулбар */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени, телефону, городу..."
          className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent flex-1 min-w-[220px]" />
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors">
          + Добавить клиента
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Загружаю...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">{search ? 'Ничего не найдено' : 'Клиентов пока нет. Они появятся автоматически при поступлении заказов.'}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(client => (
            <ClientCard key={client.id} client={client} onDelete={deleteClient} />
          ))}
        </div>
      )}

      {/* Форма добавления */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-primary text-lg mb-4">Новый клиент</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Имя и фамилия</label>
                <input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))}
                  placeholder="Иванова Мария" className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Телефон *</label>
                <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                  placeholder="+7 (999) 000-00-00" className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Email</label>
                <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                  placeholder="email@example.com" className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Город</label>
                <input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))}
                  placeholder="Москва" className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={addClient} disabled={saving || !form.phone.trim()}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Сохраняю...' : 'Добавить'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClients;

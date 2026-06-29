import { useState, useEffect } from 'react';
import urls from '../../../../backend/func2url.json';

interface ClientInfo {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  city: string;
  order_count: number;
  total_sum: number;
}

interface Props {
  phone: string;
  name: string;
  onClose: () => void;
}

export const ClientModal = ({ phone, name, onClose }: Props) => {
  const [client, setClient]   = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(urls['clients']);
        const data = await res.json();
        const found = (data.clients || []).find((c: ClientInfo) => c.phone === phone || c.full_name === name);
        setClient(found || null);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [phone, name]);

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-primary/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-primary text-lg">Клиент</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-primary text-xl">✕</button>
        </div>
        {loading ? (
          <p className="text-muted-foreground text-sm">Загружаю...</p>
        ) : !client ? (
          <p className="text-muted-foreground text-sm">Клиент не найден в базе.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="font-bold text-primary text-base">{client.full_name}</div>
              {client.city && <div className="text-sm text-muted-foreground">{client.city}</div>}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {client.phone && <><div className="text-muted-foreground">Телефон</div><div className="text-primary">{client.phone}</div></>}
              {client.email && <><div className="text-muted-foreground">Email</div><div className="text-primary">{client.email}</div></>}
              <div className="text-muted-foreground">Заказов</div>
              <div className="font-bold text-primary">{client.order_count}</div>
              <div className="text-muted-foreground">Сумма</div>
              <div className="font-bold text-primary">{client.total_sum.toLocaleString('ru-RU')} ₽</div>
            </div>
            <a href="/admin/clients" className="text-xs text-accent hover:underline">Открыть в базе клиентов →</a>
          </div>
        )}
      </div>
    </div>
  );
};

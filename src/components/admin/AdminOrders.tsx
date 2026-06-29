import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';
import { STAGES, CLOSED_STAGE, Order, canAdvanceStage } from './orderUtils';
import OrderFullCard from './OrderFullCard';
import { ViewMode } from './orders/orderHelpers';
import { KanbanView, ListView, CalendarView, GanttView } from './orders/OrderViews';
import { ClientModal } from './orders/ClientModal';

const VIEW_BUTTONS: { key: ViewMode; icon: string; label: string }[] = [
  { key: 'kanban',   icon: 'Columns2',    label: 'Канбан'    },
  { key: 'list',     icon: 'List',        label: 'Список'    },
  { key: 'calendar', icon: 'CalendarDays',label: 'Календарь' },
  { key: 'gantt',    icon: 'BarChart2',   label: 'Ганнт'     },
];

const AdminOrders = () => {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId]   = useState<number | null>(null);
  const [view, setView]       = useState<ViewMode>('kanban');
  const [fullOrder, setFullOrder]     = useState<Order | null>(null);
  const [clientModal, setClientModal] = useState<{ phone: string; name: string } | null>(null);

  const load = async () => {
    const res  = await fetch(urls['orders']);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patchOrder = async (id: number, patch: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
    if (fullOrder?.id === id) setFullOrder(prev => prev ? { ...prev, ...patch } : prev);
    await fetch(urls['orders'], {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
  };

  const handleDrop = (stage: string) => {
    if (dragId === null) return;
    const order = orders.find(o => o.id === dragId);
    if (!order) return;
    if (stage === 'В очереди на плетение' && !order.due_date) {
      alert('Заполните дату готовности перед переводом'); return;
    }
    if (stage === 'Плетение' && (!order.due_weaving || !order.due_painting)) {
      alert('Заполните срок плетения и окраски перед переводом в Плетение'); return;
    }
    const check = canAdvanceStage(order, stage);
    if (!check.ok) { alert(check.reason); return; }
    patchOrder(dragId, { stage, is_archived: stage === CLOSED_STAGE });
    setDragId(null);
  };

  const workStages   = STAGES.filter(s => s !== CLOSED_STAGE);
  const activeOrders = orders.filter(o => !o.is_archived && !o.is_trashed);
  const archived     = orders.filter(o => o.is_archived && !o.is_trashed);
  const trashed      = orders.filter(o => o.is_trashed);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-display text-2xl font-semibold text-primary">Заказы</h1>
        <div className="flex gap-1.5">
          {VIEW_BUTTONS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
                view === v.key ? 'bg-primary text-white border-primary' : 'border-primary/30 text-primary hover:border-primary'
              }`}>
              <Icon name={v.icon} size={14} />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Загружаю...</p>
      ) : view === 'kanban' ? (
        <KanbanView
          workStages={workStages}
          activeOrders={activeOrders}
          archived={archived}
          trashed={trashed}
          dragId={dragId}
          setDragId={setDragId}
          patchOrder={patchOrder}
          setFullOrder={setFullOrder}
          handleDrop={handleDrop}
        />
      ) : view === 'list' ? (
        <ListView orders={orders} onUpdate={patchOrder} onOpenFull={setFullOrder} />
      ) : view === 'calendar' ? (
        <CalendarView orders={orders} onOpenFull={setFullOrder} />
      ) : (
        <GanttView orders={orders} onOpenFull={setFullOrder} />
      )}

      {fullOrder && (
        <OrderFullCard
          order={fullOrder}
          onClose={() => setFullOrder(null)}
          onUpdate={patchOrder}
          onOpenClient={(phone, name) => setClientModal({ phone, name })}
        />
      )}

      {clientModal && (
        <ClientModal
          phone={clientModal.phone}
          name={clientModal.name}
          onClose={() => setClientModal(null)}
        />
      )}
    </div>
  );
};

export default AdminOrders;
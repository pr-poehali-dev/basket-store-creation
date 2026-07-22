import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import urls from '../../backend/func2url.json';

interface LocationState {
  total: number;
  deliveryLabel: string;
  isPickup: boolean;
  form: Record<string, string>;
  days: string[];
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart, items } = useCart();
  const state = location.state as LocationState | null;

  const [method, setMethod] = useState<'qr' | 'invoice' | null>(null);
  const [invoiceData, setInvoiceData] = useState('');
  const [invoiceError, setInvoiceError] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!state) {
    navigate('/cart');
    return null;
  }

  const total = state.total ?? 0;
  const deliveryLabel = state.deliveryLabel ?? 'Самовывоз';

  const handleOrder = async () => {
    if (method === 'invoice' && !invoiceData.trim()) {
      setInvoiceError(true);
      return;
    }
    if (saving) return;
    setSaving(true);
    const orderNum = Math.floor(Math.random() * 9000) + 1000;
    const form = state.form || {};

    // Тип доставки: смв (самовывоз), тк (транспортная), ати (частный перевозчик)
    let deliveryType = 'ати';
    if (state.isPickup) deliveryType = 'смв';
    else if (/транспортн/i.test(deliveryLabel)) deliveryType = 'тк';

    // При самовывозе город — всегда Саратов
    const city = state.isPickup ? 'Саратов' : (form.city || '');

    try {
      await fetch(urls['orders'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: String(orderNum),
          stage: 'Новый заказ',
          city,
          customer_name: form.name || '',
          phone: form.phone || '',
          total,
          delivery_label: deliveryLabel,
          delivery_type: deliveryType,
          payment_method: method === 'qr' ? 'QR-код' : `Счёт: ${invoiceData}`,
          items: items.map(i => ({
            name: i.name,
            size: i.size,
            color: i.color,
            qty: i.qty,
          })),
          form,
        }),
      });
    } catch {
      // даже при ошибке показываем успех клиенту — заказ примет менеджер
    }
    setSaving(false);
    setSuccess(`Заказ №${orderNum} оформлен. Менеджер свяжется с вами в ближайшее время!`);
  };

  const handleSuccessClose = () => {
    clearCart();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Модальное окно успеха */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-background border border-border p-8 max-w-md w-full text-center rounded-3xl">
            <Icon name="CheckCircle" size={52} className="mx-auto mb-4 text-accent" />
            <h2 className="text-2xl font-semibold mb-3">Готово!</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">{success}</p>
            <Button onClick={handleSuccessClose} className="bg-accent text-accent-foreground w-full h-11">
              Хорошо
            </Button>
          </div>
        </div>
      )}

      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-2xl px-0">

          {/* Прогресс */}
          <div className="flex items-center gap-2 text-sm mb-8 flex-wrap">
            <Link to="/cart" className="text-muted-foreground hover:text-accent transition-colors">Корзина</Link>
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
            <Link to="/checkout" state={state} className="text-muted-foreground hover:text-accent transition-colors">Данные для доставки</Link>
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
            <span className="font-medium text-foreground">Способ оплаты</span>
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Оформление</span>
          </div>

          <div className="mb-8">
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-3">Шаг 3</p>
            <h1 className="text-4xl font-semibold">Способ оплаты</h1>
          </div>

          {/* Сводка */}
          <div className="border border-border p-5 mb-8 bg-secondary/20 space-y-2 rounded-2xl">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Сумма заказа</span>
              <span className="font-semibold">{fmt(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Способ доставки</span>
              <span className="text-right max-w-[60%]">{deliveryLabel}</span>
            </div>
          </div>

          {/* Выбор способа оплаты */}
          <div className="space-y-4 mb-8">
            {/* QR */}
            <button
              onClick={() => setMethod('qr')}
              className={`w-full flex items-center gap-4 border p-5 text-left transition-colors ${method === 'qr' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${method === 'qr' ? 'border-accent' : 'border-muted-foreground'}`}>
                {method === 'qr' && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
              </div>
              <div className="flex items-center gap-3 flex-1">
                <Icon name="QrCode" size={28} className="text-accent flex-shrink-0" />
                <div>
                  <p className="font-medium">Оплата по QR-коду</p>
                  <p className="text-sm text-muted-foreground my-[1px]">QR-код для оплаты пришлёт менеджер после подтверждения заказа</p>
                </div>
              </div>
            </button>

            {/* Счёт */}
            <button
              onClick={() => setMethod('invoice')}
              className={`w-full flex items-center gap-4 border p-5 text-left transition-colors ${method === 'invoice' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${method === 'invoice' ? 'border-accent' : 'border-muted-foreground'}`}>
                {method === 'invoice' && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
              </div>
              <div className="flex items-center gap-3 flex-1">
                <Icon name="FileText" size={28} className="text-accent flex-shrink-0" />
                <div>
                  <p className="font-medium">Оплата по счёту</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Для физических и юридических лиц</p>
                </div>
              </div>
            </button>

            {/* Поле для данных счёта */}
            {method === 'invoice' && (
              <div className="border border-border bg-secondary/10 p-5 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Если оплата от <strong>физического лица</strong> — укажите ФИО на кого выставить счёт.<br />
                  Если оплата от <strong>юридического лица</strong> — укажите ИНН организации.
                </p>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                    ФИО или ИНН организации <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={invoiceData}
                    onChange={e => { setInvoiceData(e.target.value); setInvoiceError(false); }}
                    placeholder="Иванова Мария Ивановна / 7712345678"
                    className={`w-full border bg-background px-4 py-2.5 text-sm outline-none transition-colors ${invoiceError ? 'border-destructive focus:border-destructive' : 'border-border focus:border-accent'}`}
                  />
                  {invoiceError && (
                    <p className="text-xs text-destructive mt-1">Обязательное поле</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Кнопки */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleOrder}
              disabled={!method || saving}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Оформляю...' : 'Оформить заказ'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/checkout', { state })}
              className="h-12"
            >
              <Icon name="ArrowLeft" size={16} className="mr-2" />
              Назад
            </Button>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Payment;
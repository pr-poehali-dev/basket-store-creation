import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';

interface LocationState {
  total: number;
  deliveryLabel: string;
}

const DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

function fmt(n: number) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function phoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  let result = '+7';
  if (digits.length > 1) result += ' (' + digits.slice(1, 4);
  if (digits.length >= 4) result += ') ' + digits.slice(4, 7);
  if (digits.length >= 7) result += '-' + digits.slice(7, 9);
  if (digits.length >= 9) result += '-' + digits.slice(9, 11);
  return result;
}

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const state = location.state as LocationState | null;

  const total = state?.total ?? 0;
  const deliveryLabel = state?.deliveryLabel ?? 'Самовывоз';
  const showExtra = total >= 20_000;

  const [form, setForm] = useState({
    name: '',
    city: '',
    phone: '',
    date: '',
    address: '',
    time: '09:00',
    wishes: '',
  });
  const [days, setDays] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [showError, setShowError] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Если зашли напрямую без state — вернуть в корзину
  useEffect(() => {
    if (!state) navigate('/cart');
  }, [state, navigate]);

  const set = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: false }));
    setShowError(false);
  };

  const toggleDay = (day: string) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    setErrors(e => ({ ...e, days: false }));
    setShowError(false);
  };

  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = phoneMask(e.target.value);
    set('phone', masked);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, boolean> = {};
    if (!form.name.trim()) newErrors.name = true;
    if (!form.city.trim()) newErrors.city = true;
    if (form.phone.replace(/\D/g, '').length < 11) newErrors.phone = true;
    if (!form.date) newErrors.date = true;
    if (showExtra) {
      if (!form.address.trim()) newErrors.address = true;
      if (days.length === 0) newErrors.days = true;
      if (!form.time) newErrors.time = true;
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setShowError(true);
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const orderNum = Math.floor(Math.random() * 9000) + 1000;
    setSuccess(`Заказ №${orderNum} успешно оформлен! В ближайшее время с вами свяжется менеджер для подтверждения заказа и согласования способа оплаты.`);
  };

  const handleSuccessClose = () => {
    clearCart();
    navigate('/');
  };

  if (!state) return null;

  const inputCls = (field: string) =>
    `w-full border bg-background px-4 py-2.5 text-sm outline-none transition-colors ${errors[field] ? 'border-destructive focus:border-destructive' : 'border-border focus:border-accent'}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Модальное окно успеха */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-background border border-border p-8 max-w-md w-full text-center">
            <Icon name="CheckCircle" size={52} className="mx-auto mb-4 text-accent" />
            <h2 className="font-display text-2xl font-semibold mb-3">Готово!</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">{success}</p>
            <Button onClick={handleSuccessClose} className="bg-accent text-accent-foreground rounded-none w-full h-11">
              Хорошо
            </Button>
          </div>
        </div>
      )}

      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-2xl">

          {/* Прогресс */}
          <div className="flex items-center gap-2 text-sm mb-8">
            <Link to="/cart" className="text-muted-foreground hover:text-accent transition-colors">Корзина</Link>
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
            <span className="font-medium text-foreground">Оформление</span>
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Подтверждение</span>
          </div>

          <div className="mb-8">
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-3">Шаг 2</p>
            <h1 className="font-display text-4xl font-semibold">Оформление заказа</h1>
          </div>

          {/* Сводка заказа */}
          <div className="border border-border p-5 mb-8 bg-secondary/20 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Сумма заказа</span>
              <span className="font-semibold">{fmt(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Способ доставки</span>
              <span className="text-right max-w-[60%]">{deliveryLabel}</span>
            </div>
          </div>

          {/* Сообщение об ошибке */}
          {showError && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 text-sm mb-6">
              <Icon name="AlertCircle" size={16} />
              Пожалуйста, заполните все обязательные поля
            </div>
          )}

          {/* Форма */}
          <div className="space-y-5">

            {/* Имя */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                Имя <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Ваше имя"
                className={inputCls('name')}
              />
            </div>

            {/* Город */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                Город <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="Город получения"
                className={inputCls('city')}
              />
            </div>

            {/* Телефон */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                Контактный номер телефона <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={handlePhone}
                placeholder="+7 (___) ___-__-__"
                className={inputCls('phone')}
              />
            </div>

            {/* Желаемая дата */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                Желаемая дата получения заказа <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={inputCls('date')}
              />
            </div>

            {/* Дополнительные поля при сумме от 20 000 */}
            {showExtra && (
              <>
                <div className="border-t border-border pt-5">
                  <p className="text-xs text-muted-foreground mb-4">Дополнительно для доставки</p>

                  {/* Адрес */}
                  <div className="mb-5">
                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                      Точный адрес получения <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={e => set('address', e.target.value)}
                      placeholder="Улица, дом, квартира / офис"
                      className={inputCls('address')}
                    />
                  </div>

                  {/* Дни недели */}
                  <div className="mb-5">
                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Дни, когда сможете принять доставку <span className="text-destructive">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1.5 text-sm border transition-colors ${
                            days.includes(day)
                              ? 'bg-accent border-accent text-accent-foreground'
                              : errors.days
                              ? 'border-destructive hover:border-accent'
                              : 'border-border hover:border-accent'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    {errors.days && (
                      <p className="text-xs text-destructive mt-1">Выберите хотя бы один день</p>
                    )}
                  </div>

                  {/* Время */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                      Время, когда сможете принять доставку <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={form.time}
                      onChange={e => set('time', e.target.value)}
                      className={inputCls('time') + ' cursor-pointer'}
                    >
                      {HOURS.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Пожелания */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                Пожелания
              </label>
              <textarea
                value={form.wishes}
                onChange={e => set('wishes', e.target.value)}
                placeholder="Комментарий к заказу (необязательно)"
                rows={3}
                className="w-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent resize-none transition-colors"
              />
            </div>

            {/* Кнопки */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 text-base"
              >
                Выбрать способ оплаты
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/cart')}
                className="rounded-none h-12"
              >
                <Icon name="ArrowLeft" size={16} className="mr-2" />
                Вернуться в корзину
              </Button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;

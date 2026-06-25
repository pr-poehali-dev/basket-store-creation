import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';

const MIN_ORDER = 10_000;

function deliveryRange(total: number): { label: string; pct: [number, number] } | null {
  if (total < MIN_ORDER) return null;
  if (total < 20_000) return { label: 'Доставка транспортной компанией до пункта выдачи', pct: [15, 20] };
  if (total < 40_000) return { label: 'Доставка частным грузоперевозчиком до адреса', pct: [10, 15] };
  if (total < 100_000) return { label: 'Доставка частным грузоперевозчиком до адреса', pct: [5, 10] };
  return { label: 'Доставка частным грузоперевозчиком до адреса', pct: [5, 7] };
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

const Cart = () => {
  const { items, removeItem, updateQty, clearCart } = useCart();
  const [delivery, setDelivery] = useState<'pickup' | 'courier'>('pickup');
  const [qtyInputs, setQtyInputs] = useState<Record<number, string>>({});
  const navigate = useNavigate();

  const getQtyStr = (id: number, qty: number) => qtyInputs[id] ?? String(qty);

  const handleQtyChange = (id: number, raw: string) => {
    setQtyInputs(prev => ({ ...prev, [id]: raw }));
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= 1) updateQty(id, v);
  };

  const handleQtyBlur = (id: number, qty: number) => {
    const v = parseInt(qtyInputs[id] ?? '', 10);
    if (isNaN(v) || v < 1) {
      setQtyInputs(prev => ({ ...prev, [id]: String(qty) }));
    }
  };

  // Сумма по базовым ценам (без акций) — для определения порога скидки
  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.qty, 0),
    [items]
  );

  // Есть ли акционные товары в корзине
  const hasPromo = useMemo(() => items.some(i => i.is_promo && i.sale_price !== null), [items]);

  // Экономия по акции
  const promoDiscount = useMemo(
    () => items
      .filter(i => i.is_promo && i.sale_price !== null)
      .reduce((s, i) => s + (i.price - i.sale_price!) * i.qty, 0),
    [items]
  );

  // Порог скидки — от общей базовой суммы (все товары)
  const discountPct = useMemo(() => {
    if (subtotal >= 500_000) return null; // персональная
    if (subtotal >= 200_000) return 20;
    if (subtotal >= 60_000) return 16;
    return 0;
  }, [subtotal]);

  const isPersonal = subtotal >= 500_000;
  const hasWholesale = !isPersonal && !!discountPct && discountPct > 0;

  // Оптовая скидка только на обычные товары (по базовой цене)
  const regularSubtotal = useMemo(
    () => items.filter(i => !i.is_promo).reduce((s, i) => s + i.price * i.qty, 0),
    [items]
  );
  const wholesaleDiscount = hasWholesale ? Math.round(regularSubtotal * discountPct! / 100) : 0;

  // Итог = базовая сумма − скидка по акции − оптовая скидка
  const total = subtotal - promoDiscount - wholesaleDiscount;

  const deliveryInfo = useMemo(() => deliveryRange(total), [total]);
  const deliveryMin = deliveryInfo ? Math.round(total * deliveryInfo.pct[0] / 100) : 0;
  const deliveryMax = deliveryInfo ? Math.round(total * deliveryInfo.pct[1] / 100) : 0;

  const canOrder = subtotal >= MIN_ORDER;

  const handleCheckout = () => {
    const deliveryLabel = delivery === 'pickup'
      ? 'Самовывоз'
      : (deliveryInfo?.label ?? 'Доставка перевозчиком');
    navigate('/checkout', { state: { total, deliveryLabel, isPickup: delivery === 'pickup' } });
  };

  // Логика отображения блока сумм
  // Случай 1: есть акционные товары → всегда показываем разбивку
  // Случай 2: нет акционных, сумма < 60k → только итог
  // Случай 3: нет акционных, сумма >= 60k → сумма без скидки + оптовая скидка + итог
  const showFullBreakdown = hasPromo || (hasWholesale && wholesaleDiscount > 0) || isPersonal;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto">
          <div className="mb-10">
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-3">Оформление</p>
            <h1 className="font-display text-5xl font-semibold">Корзина</h1>
          </div>

          {/* Прогресс */}
          <div className="flex items-center gap-2 text-sm mb-10">
            <span className="font-medium text-foreground">Корзина</span>
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Оформление</span>
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Подтверждение</span>
          </div>

          {items.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground">
              <Icon name="ShoppingCart" size={48} className="mx-auto mb-4 opacity-30" />
              <p className="mb-6 text-lg">Корзина пуста</p>
              <Button asChild className="bg-accent text-accent-foreground rounded-none">
                <Link to="/catalog">Перейти в каталог</Link>
              </Button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_380px] gap-10">

              {/* Список товаров */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{items.length} позиц.</p>
                  <button onClick={clearCart} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                    Очистить корзину
                  </button>
                </div>

                {items.map(item => {
                  const unitEffective = item.is_promo && item.sale_price ? item.sale_price : item.price;
                  const lineTotal = unitEffective * item.qty;
                  return (
                    <div key={item.id} className="flex gap-4 border border-border p-4">
                      {/* Фото */}
                      <div className="w-20 h-20 bg-secondary shrink-0 overflow-hidden">
                        {item.image_url
                          ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <Icon name="Image" size={24} className="opacity-20" />
                            </div>
                        }
                      </div>

                      {/* Инфо */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium leading-tight">{item.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.size}{item.color ? ` · ${item.color}` : ''}</p>
                            {item.is_promo && (
                              <span className="inline-block mt-1 text-[10px] uppercase tracking-wider bg-accent/10 text-accent border border-accent/30 px-1.5 py-0.5">
                                Акция
                              </span>
                            )}
                          </div>
                          <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5">
                            <Icon name="Trash2" size={16} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          {/* Кол-во с ручным вводом */}
                          <div className="flex items-center border border-border">
                            <button
                              onClick={() => updateQty(item.id, item.qty - 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-secondary transition-colors text-lg"
                            >−</button>
                            <input
                              type="number"
                              value={getQtyStr(item.id, item.qty)}
                              onChange={e => handleQtyChange(item.id, e.target.value)}
                              onBlur={() => handleQtyBlur(item.id, item.qty)}
                              className="w-12 h-8 border-x border-border text-center text-sm outline-none focus:border-accent bg-background [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              onClick={() => updateQty(item.id, item.qty + 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-secondary transition-colors text-lg"
                            >+</button>
                          </div>

                          {/* Цена */}
                          <div className="text-right">
                            <p className="font-semibold">{fmt(lineTotal)}</p>
                            {item.is_promo && item.sale_price ? (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                <span className="text-accent">{fmt(item.sale_price)}</span>
                                <span className="line-through">{fmt(item.price)}</span>
                                {item.qty > 1 && <span>× {item.qty}</span>}
                              </div>
                            ) : item.qty > 1 ? (
                              <p className="text-xs text-muted-foreground">{fmt(item.price)} × {item.qty}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(hasPromo || hasWholesale) && (
                  <p className="text-xs text-muted-foreground border-l-2 border-accent/40 pl-3">
                    Скидка не распространяется на товары по акции
                  </p>
                )}
              </div>

              {/* Итог */}
              <div className="space-y-6">
                <div className="border border-border p-6 space-y-3">
                  <h2 className="font-display text-xl font-semibold mb-4">Итого</h2>

                  {showFullBreakdown ? (
                    <>
                      {/* Всегда показываем базовую сумму */}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Сумма без скидки</span>
                        <span>{fmt(subtotal)}</span>
                      </div>

                      {/* Скидка по акции */}
                      {hasPromo && promoDiscount > 0 && (
                        <div className="flex justify-between text-sm text-accent">
                          <span>Скидка по акции</span>
                          <span>−{fmt(promoDiscount)}</span>
                        </div>
                      )}

                      {/* Оптовая скидка или персональная */}
                      {isPersonal ? (
                        <div className="bg-accent/5 border border-accent/20 p-3 text-sm text-muted-foreground">
                          <Icon name="Info" size={14} className="inline mr-1.5 text-accent" />
                          Для согласования персональной скидки оформите заказ, и с вами свяжется менеджер для перерасчёта
                        </div>
                      ) : hasWholesale && wholesaleDiscount > 0 ? (
                        <div className="flex justify-between text-sm text-accent">
                          <span>Оптовая скидка {discountPct}%</span>
                          <span>−{fmt(wholesaleDiscount)}</span>
                        </div>
                      ) : null}

                      <div className="flex justify-between font-semibold text-base pt-2 border-t border-border">
                        <span>Итоговая сумма</span>
                        <span>{fmt(total)}</span>
                      </div>
                    </>
                  ) : (
                    /* Только итог — нет акций, нет оптовой скидки */
                    <div className="flex justify-between font-semibold text-base">
                      <span>Итоговая сумма</span>
                      <span>{fmt(total)}</span>
                    </div>
                  )}

                  {!canOrder && (
                    <p className="text-xs text-destructive pt-1">
                      Минимальная сумма заказа — {fmt(MIN_ORDER)}
                    </p>
                  )}
                </div>

                {/* Доставка */}
                <div className="border border-border p-6 space-y-4">
                  <h2 className="font-display text-xl font-semibold">Доставка</h2>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="radio" name="delivery" checked={delivery === 'pickup'} onChange={() => setDelivery('pickup')} className="mt-1 accent-accent" />
                    <div>
                      <p className="text-sm font-medium">Самовывоз</p>
                      <p className="text-xs text-muted-foreground mt-0.5">г. Саратов, ул. Зенитная, 25</p>
                      <p className="text-xs text-accent mt-0.5">Бесплатно</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="radio" name="delivery" checked={delivery === 'courier'} onChange={() => setDelivery('courier')} className="mt-1 accent-accent" disabled={!deliveryInfo} />
                    <div className={!deliveryInfo ? 'opacity-40' : ''}>
                      <p className="text-sm font-medium">
                        {deliveryInfo ? deliveryInfo.label : 'Доставка перевозчиком'}
                      </p>
                      {deliveryInfo ? (
                        <>
                          <p className="text-sm font-semibold text-accent mt-1">{fmt(deliveryMin)} – {fmt(deliveryMax)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Оплата доставки производится при получении</p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">Доступно от {fmt(MIN_ORDER)}</p>
                      )}
                    </div>
                  </label>

                  <p className="text-xs text-muted-foreground border-l-2 border-border pl-3 leading-relaxed">
                    Стоимость доставки указана приблизительно для расчёта бюджета. Точная стоимость зависит от удалённости, габаритов груза и направления доставки в ваш регион
                  </p>
                </div>

                <Button
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!canOrder}
                  onClick={handleCheckout}
                >
                  Оформить заказ
                </Button>
                {!canOrder && (
                  <p className="text-xs text-center text-muted-foreground -mt-3">
                    Минимальная сумма заказа — {fmt(MIN_ORDER)}
                  </p>
                )}
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Cart;
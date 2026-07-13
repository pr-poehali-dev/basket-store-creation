// Пороги оптовых скидок — должны совпадать с логикой корзины (src/pages/Cart.tsx)
export const WHOLESALE_TIERS = [
  { threshold: 60_000,  pct: 16 },
  { threshold: 200_000, pct: 20 },
];

function fmt(n: number) {
  return Math.round(n).toLocaleString('ru-RU') + ' ₽';
}

// Компактная версия — для карточки в каталоге (не увеличивает карточку)
export const PriceTiersCompact = ({ price, isPromo }: { price: number; isPromo: boolean }) => {
  if (isPromo) return null; // на акционный товар оптовая скидка не действует

  return (
    <div className="text-[10px] leading-tight text-muted-foreground space-y-0.5 mt-1">
      {WHOLESALE_TIERS.map(t => (
        <div key={t.threshold} className="flex items-center gap-1">
          <span className="text-accent font-semibold">{fmt(price * (1 - t.pct / 100))}</span>
          <span>от {fmt(t.threshold)} ({t.pct}%)</span>
        </div>
      ))}
    </div>
  );
};

// Развёрнутая версия — для страницы товара, 3 явные градации
export const PriceTiersFull = ({ price, isPromo }: { price: number; isPromo: boolean }) => {
  if (isPromo) return null;

  return (
    <div className="border border-border rounded-2xl divide-y divide-border overflow-hidden mt-4">
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-sm text-muted-foreground">Розничная цена</span>
        <span className="font-semibold">{fmt(price)}</span>
      </div>
      {WHOLESALE_TIERS.map(t => (
        <div key={t.threshold} className="flex items-center justify-between px-4 py-2.5">
          <div>
            <span className="text-sm text-muted-foreground">Оптовая цена −{t.pct}%</span>
            <p className="text-[11px] text-muted-foreground/70">при заказе от {fmt(t.threshold)}</p>
          </div>
          <span className="font-semibold text-accent">{fmt(price * (1 - t.pct / 100))}</span>
        </div>
      ))}
    </div>
  );
};

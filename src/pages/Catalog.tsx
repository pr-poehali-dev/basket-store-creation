import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { SHAPES, SIZES } from '@/data/products';
import { colorToCss, sortColors } from '@/data/colors';
import Header from '@/components/Header';
import urls from '../../backend/func2url.json';

interface Product {
  id: number;
  name: string;
  description: string;
  shape: string;
  size: string;
  size_category: string;
  color: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  group_id: string | null;
  group_by: string | null;
  split_by: string | null;
}

interface Card {
  type: 'single' | 'group';
  group_id?: string;
  variants: Product[];
}

// Карточка товара с вариантами цвета
const ProductCard = ({ card, cardIndex }: { card: Card; cardIndex: number }) => {
  const navigate = useNavigate();

  const groupByFields = (card.variants[0]?.group_by || '').toLowerCase().split(';').map(f => f.trim());
  const hasColorVariants = card.variants.length > 1 && (
    groupByFields.includes('color') || groupByFields.includes('цвет') || card.type === 'group'
  );

  const colorVariants = useMemo(() => {
    if (!hasColorVariants) return [];
    const seen = new Set<string>();
    const unique = card.variants.filter(v => {
      const key = v.color || '';
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return sortColors(unique);
  }, [card.variants, hasColorVariants]);

  const displayVariants = hasColorVariants ? colorVariants : [];

  // Первый цвет по сортировке (натуральный)
  const defaultIdx = useMemo(() => {
    if (!displayVariants.length) return 0;
    const first = displayVariants[0];
    return card.variants.indexOf(first);
  }, [displayVariants, card.variants]);

  const [activeIdx, setActiveIdx] = useState(defaultIdx);
  const active = card.variants[activeIdx] ?? card.variants[defaultIdx] ?? card.variants[0];

  const goToProduct = () => {
    const gid = card.group_id || 'single';
    navigate(`/product/${gid}/${cardIndex}`);
  };

  return (
    <article
      className="group bg-card border border-border hover-lift cursor-pointer"
      onClick={goToProduct}
    >
      <div className="overflow-hidden aspect-square">
        {active.image_url
          ? <img src={active.image_url} alt={active.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="w-full h-full bg-secondary flex items-center justify-center"><Icon name="Image" size={48} className="opacity-20" /></div>
        }
      </div>
      <div className="p-5">
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <span className="text-[11px] uppercase tracking-wider text-accent border border-accent/40 px-2 py-0.5">{active.shape}</span>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{active.size}</span>
        </div>
        <h3 className="font-display text-xl font-semibold mb-3">{active.name}</h3>

        {displayVariants.length > 1 && (
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Цвет: {active.color || '—'}
            </p>
            <div className="flex flex-wrap gap-2">
              {displayVariants.map((v, i) => {
                const realIdx = card.variants.indexOf(v);
                const isActive = realIdx === activeIdx || (activeIdx >= card.variants.length && i === 0);
                return (
                  <button
                    key={v.id}
                    title={v.color}
                    onClick={e => { e.stopPropagation(); setActiveIdx(realIdx); }}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${isActive ? 'border-accent scale-110' : 'border-transparent hover:border-accent/50'}`}
                    style={{ backgroundColor: colorToCss(v.color) }}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="font-medium">
            {active.sale_price ? (
              <span className="flex items-baseline gap-2">
                <span className="text-accent">{active.sale_price} ₽</span>
                <span className="text-xs text-muted-foreground line-through">{active.price} ₽</span>
              </span>
            ) : (
              <>{active.price} ₽<span className="text-xs text-muted-foreground"> / шт</span></>
            )}
          </span>
          <span className="text-xs text-accent flex items-center gap-1">
            Подробнее <Icon name="ArrowRight" size={12} />
          </span>
        </div>
      </div>
    </article>
  );
};

const Catalog = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [shapes, setShapes] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(900);

  useEffect(() => {
    fetch(urls['products'])
      .then(r => r.json())
      .then(data => {
        setCards(data.cards || []);
        setLoadingProducts(false);
      })
      .catch(() => setLoadingProducts(false));
  }, []);

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  // Для фильтров и ценового диапазона используем первый вариант каждой карточки
  const allFirstVariants = useMemo(() => cards.map(c => c.variants[0]).filter(Boolean), [cards]);
  const priceMax = allFirstVariants.length ? Math.max(...allFirstVariants.map(p => p.price), 900) : 900;

  const filtered = useMemo(() => cards.filter(card => {
    const p = card.variants[0];
    if (!p) return false;
    return (
      (shapes.length === 0 || shapes.includes(p.shape)) &&
      (sizes.length === 0 || sizes.includes(p.size_category)) &&
      p.price <= maxPrice
    );
  }), [cards, shapes, sizes, maxPrice]);

  const reset = () => {
    setShapes([]);
    setSizes([]);
    setMaxPrice(priceMax);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto">
          <div className="mb-12 max-w-xl">
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-3">Продукция</p>
            <h1 className="font-display text-5xl font-semibold">Каталог корзин</h1>
          </div>

          <div className="grid lg:grid-cols-[280px_1fr] gap-10">
            <aside className="space-y-8 lg:sticky lg:top-24 self-start">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl">Фильтры</h3>
                <button onClick={reset} className="text-xs text-muted-foreground hover:text-accent">
                  Сбросить
                </button>
              </div>

              <div>
                <p className="text-sm font-medium mb-3 uppercase tracking-wider text-muted-foreground">Форма</p>
                <div className="space-y-2">
                  {SHAPES.map((m) => (
                    <label key={m} className="flex items-center gap-3 cursor-pointer group">
                      <span className={`w-4 h-4 border flex items-center justify-center transition-colors ${shapes.includes(m) ? 'bg-accent border-accent' : 'border-border group-hover:border-accent'}`}>
                        {shapes.includes(m) && <Icon name="Check" size={12} className="text-accent-foreground" />}
                      </span>
                      <input type="checkbox" className="hidden" checked={shapes.includes(m)} onChange={() => toggle(shapes, setShapes, m)} />
                      <span className="text-sm">{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3 uppercase tracking-wider text-muted-foreground">Размер</p>
                <div className="space-y-2">
                  {SIZES.map((s) => (
                    <label key={s} className="flex items-center gap-3 cursor-pointer group">
                      <span className={`w-4 h-4 border flex items-center justify-center transition-colors ${sizes.includes(s) ? 'bg-accent border-accent' : 'border-border group-hover:border-accent'}`}>
                        {sizes.includes(s) && <Icon name="Check" size={12} className="text-accent-foreground" />}
                      </span>
                      <input type="checkbox" className="hidden" checked={sizes.includes(s)} onChange={() => toggle(sizes, setSizes, s)} />
                      <span className="text-sm">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-4 uppercase tracking-wider text-muted-foreground">
                  Цена за шт. до {maxPrice} ₽
                </p>
                <Slider value={[maxPrice]} onValueChange={(v) => setMaxPrice(v[0])} min={0} max={priceMax} step={10} />
              </div>
            </aside>

            <div>
              {loadingProducts ? (
                <div className="py-24 text-center text-muted-foreground">
                  <Icon name="Loader" size={36} className="mx-auto mb-4 opacity-40 animate-spin" />
                  Загружаю каталог...
                </div>
              ) : cards.length === 0 ? (
                <div className="py-24 text-center text-muted-foreground">
                  <Icon name="Package" size={40} className="mx-auto mb-4 opacity-40" />
                  Каталог пока пуст. Товары добавляются через админку.
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-6">Найдено: {filtered.length}</p>
                  {filtered.length === 0 ? (
                    <div className="py-24 text-center text-muted-foreground">
                      <Icon name="SearchX" size={40} className="mx-auto mb-4 opacity-40" />
                      По выбранным фильтрам ничего не найдено
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                      {(() => {
                        const groupCounters: Record<string, number> = {};
                        return filtered.map((card) => {
                          const gid = card.group_id || `single_${card.variants[0]?.id}`;
                          const cardIndex = groupCounters[gid] ?? 0;
                          groupCounters[gid] = cardIndex + 1;
                          return (
                            <ProductCard
                              key={`${gid}-${cardIndex}`}
                              card={card}
                              cardIndex={cardIndex}
                            />
                          );
                        });
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Catalog;
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { SHAPES, SIZES } from '@/data/products';
import { colorToCss, sortColors } from '@/data/colors';
import Header from '@/components/Header';
import { useCart } from '@/context/CartContext';
import urls from '../../backend/func2url.json';

const WEAVE_TYPES = ['На колотой', 'На шпоне'];
const HANDLES_OPTIONS = ['1 ручка', '2 ручки'];

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
  labels: string | null;
  weave_type: string | null;
  handles_count: string | null;
  is_promo?: boolean;
}

interface Card {
  type: 'single' | 'group';
  group_id?: string;
  variants: Product[];
}

// Парсит метки из строки "новинка;акция"
function parseLabels(s: string | null): string[] {
  if (!s) return [];
  return s.split(';').map(l => l.trim().toLowerCase()).filter(Boolean);
}

// Карточка товара с вариантами цвета
const ProductCard = ({ card, cardIndex }: { card: Card; cardIndex: number }) => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

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

  const defaultIdx = useMemo(() => {
    if (!displayVariants.length) return 0;
    const first = displayVariants[0];
    return card.variants.indexOf(first);
  }, [displayVariants, card.variants]);

  const [activeIdx, setActiveIdx] = useState(defaultIdx);
  const active = card.variants[activeIdx] ?? card.variants[defaultIdx] ?? card.variants[0];

  const labels = parseLabels(active.labels);
  const isPromo = labels.includes('акция') || !!active.sale_price;
  const isNew = labels.includes('новинка');
  const isTop = labels.includes('топ продаж');

  const goToProduct = () => {
    const gid = card.group_id || 'single';
    navigate(`/product/${gid}/${cardIndex}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      id: active.id,
      name: active.name,
      price: active.price,
      sale_price: active.sale_price,
      image_url: active.image_url,
      color: active.color,
      size: active.size,
      is_promo: isPromo,
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article
      className="group bg-card border border-border hover-lift cursor-pointer flex flex-col"
      onClick={goToProduct}
    >
      {/* Фото */}
      <div className="overflow-hidden aspect-square relative">
        {active.image_url
          ? <img src={active.image_url} alt={active.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="w-full h-full bg-secondary flex items-center justify-center"><Icon name="Image" size={48} className="opacity-20" /></div>
        }
        {/* Бейджи */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isNew && <span className="text-[10px] uppercase tracking-wider bg-blue-500 text-white px-2 py-0.5">Новинка</span>}
          {isPromo && <span className="text-[10px] uppercase tracking-wider bg-accent text-accent-foreground px-2 py-0.5">Акция</span>}
          {isTop && <span className="text-[10px] uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5">Топ продаж</span>}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
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
            <div className="flex gap-1.5 flex-wrap">
              {displayVariants.map((v, i) => {
                const realIdx = card.variants.indexOf(v);
                const isActive = realIdx === activeIdx || (activeIdx >= card.variants.length && i === 0);
                return (
                  <button
                    key={v.id}
                    title={v.color}
                    onClick={e => { e.stopPropagation(); setActiveIdx(realIdx); }}
                    className={`w-5 h-5 rounded-full border-2 transition-all flex-shrink-0 ${isActive ? 'border-accent scale-110' : 'border-transparent hover:border-accent/50'}`}
                    style={{ backgroundColor: colorToCss(v.color) }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Цена */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3">
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

          {/* Кнопка в корзину + кол-во */}
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center border border-border">
              <button
                onClick={e => { e.stopPropagation(); setQty(q => Math.max(1, q - 1)); }}
                className="w-7 h-8 flex items-center justify-center hover:bg-secondary transition-colors text-base"
              >−</button>
              <span className="w-8 text-center text-sm">{qty}</span>
              <button
                onClick={e => { e.stopPropagation(); setQty(q => q + 1); }}
                className="w-7 h-8 flex items-center justify-center hover:bg-secondary transition-colors text-base"
              >+</button>
            </div>
            <Button
              className={`flex-1 h-8 rounded-none text-xs transition-all ${added ? 'bg-green-600 hover:bg-green-600 text-white' : 'bg-accent hover:bg-accent/90 text-accent-foreground'}`}
              onClick={handleAddToCart}
            >
              {added ? (
                <><Icon name="Check" size={13} className="mr-1" />Добавлено</>
              ) : (
                <><Icon name="ShoppingCart" size={13} className="mr-1" />В корзину</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};

const SORT_OPTIONS = [
  { value: 'default',    label: 'По умолчанию' },
  { value: 'price_asc',  label: 'Цена: по возрастанию' },
  { value: 'price_desc', label: 'Цена: по убыванию' },
  { value: 'name_asc',   label: 'Название: А → Я' },
  { value: 'name_desc',  label: 'Название: Я → А' },
];

function CheckFilter({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <span className={`w-4 h-4 border flex items-center justify-center transition-colors flex-shrink-0 ${checked ? 'bg-accent border-accent' : 'border-border group-hover:border-accent'}`}>
        {checked && <Icon name="Check" size={12} className="text-accent-foreground" />}
      </span>
      <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

const Catalog = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [shapes, setShapes] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [weaveTypes, setWeaveTypes] = useState<string[]>([]);
  const [handles, setHandles] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 900]);
  const [minInput, setMinInput] = useState('0');
  const [maxInput, setMaxInput] = useState('900');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('default');

  useEffect(() => {
    fetch(urls['products'])
      .then(r => r.json())
      .then(data => {
        const loaded: Card[] = data.cards || [];
        setCards(loaded);
        setLoadingProducts(false);
        // Устанавливаем диапазон после загрузки
        const all = loaded.map(c => c.variants[0]).filter(Boolean);
        const minP = all.length ? Math.min(...all.map(p => p.price)) : 0;
        const maxP = all.length ? Math.max(...all.map(p => p.price)) : 900;
        setPriceRange([minP, maxP]);
        setMinInput(String(minP));
        setMaxInput(String(maxP));
      })
      .catch(() => setLoadingProducts(false));
  }, []);

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const allFirstVariants = useMemo(() => cards.map(c => c.variants[0]).filter(Boolean), [cards]);
  const globalMin = allFirstVariants.length ? Math.min(...allFirstVariants.map(p => p.price)) : 0;
  const globalMax = allFirstVariants.length ? Math.max(...allFirstVariants.map(p => p.price)) : 900;

  // Синхронизируем input -> slider
  const applyMinInput = () => {
    const v = parseInt(minInput, 10);
    if (!isNaN(v)) {
      const clamped = Math.max(globalMin, Math.min(v, priceRange[1]));
      setPriceRange([clamped, priceRange[1]]);
      setMinInput(String(clamped));
    } else {
      setMinInput(String(priceRange[0]));
    }
  };
  const applyMaxInput = () => {
    const v = parseInt(maxInput, 10);
    if (!isNaN(v)) {
      const clamped = Math.min(globalMax, Math.max(v, priceRange[0]));
      setPriceRange([priceRange[0], clamped]);
      setMaxInput(String(clamped));
    } else {
      setMaxInput(String(priceRange[1]));
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = cards.filter(card => {
      const p = card.variants[0];
      if (!p) return false;
      const price = p.sale_price ?? p.price;
      const matchesFilters =
        (shapes.length === 0 || shapes.includes(p.shape)) &&
        (sizes.length === 0 || sizes.includes(p.size_category)) &&
        (weaveTypes.length === 0 || weaveTypes.includes(p.weave_type ?? '')) &&
        (handles.length === 0 || handles.includes(p.handles_count ?? '')) &&
        price >= priceRange[0] && price <= priceRange[1];
      const matchesSearch = !q || card.variants.some(v =>
        v.name.toLowerCase().includes(q) ||
        (v.description || '').toLowerCase().includes(q)
      );
      return matchesFilters && matchesSearch;
    });

    result = [...result].sort((a, b) => {
      const pa = a.variants[0];
      const pb = b.variants[0];
      if (!pa || !pb) return 0;
      if (sort === 'price_asc')  return pa.price - pb.price;
      if (sort === 'price_desc') return pb.price - pa.price;
      if (sort === 'name_asc')   return pa.name.localeCompare(pb.name, 'ru');
      if (sort === 'name_desc')  return pb.name.localeCompare(pa.name, 'ru');
      return 0;
    });

    return result;
  }, [cards, shapes, sizes, weaveTypes, handles, priceRange, search, sort]);

  const reset = () => {
    setShapes([]);
    setSizes([]);
    setWeaveTypes([]);
    setHandles([]);
    setPriceRange([globalMin, globalMax]);
    setMinInput(String(globalMin));
    setMaxInput(String(globalMax));
    setSearch('');
    setSort('default');
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

              {/* Форма */}
              <div>
                <p className="text-sm font-medium mb-3 uppercase tracking-wider text-muted-foreground">Форма</p>
                <div className="space-y-2">
                  {SHAPES.map(m => (
                    <CheckFilter key={m} label={m} checked={shapes.includes(m)} onChange={() => toggle(shapes, setShapes, m)} />
                  ))}
                </div>
              </div>

              {/* Размер */}
              <div>
                <p className="text-sm font-medium mb-3 uppercase tracking-wider text-muted-foreground">Размер</p>
                <div className="space-y-2">
                  {SIZES.map(s => (
                    <CheckFilter key={s} label={s} checked={sizes.includes(s)} onChange={() => toggle(sizes, setSizes, s)} />
                  ))}
                </div>
              </div>

              {/* Вид плетения */}
              <div>
                <p className="text-sm font-medium mb-3 uppercase tracking-wider text-muted-foreground">Вид плетения</p>
                <div className="space-y-2">
                  {WEAVE_TYPES.map(w => (
                    <CheckFilter key={w} label={w} checked={weaveTypes.includes(w)} onChange={() => toggle(weaveTypes, setWeaveTypes, w)} />
                  ))}
                </div>
              </div>

              {/* Кол-во ручек */}
              <div>
                <p className="text-sm font-medium mb-3 uppercase tracking-wider text-muted-foreground">Кол-во ручек</p>
                <div className="space-y-2">
                  {HANDLES_OPTIONS.map(h => (
                    <CheckFilter key={h} label={h} checked={handles.includes(h)} onChange={() => toggle(handles, setHandles, h)} />
                  ))}
                </div>
              </div>

              {/* Цена */}
              <div>
                <p className="text-sm font-medium mb-4 uppercase tracking-wider text-muted-foreground">Цена за шт.</p>
                <Slider
                  value={priceRange}
                  onValueChange={(v) => {
                    setPriceRange(v as [number, number]);
                    setMinInput(String(v[0]));
                    setMaxInput(String(v[1]));
                  }}
                  min={globalMin}
                  max={globalMax}
                  step={10}
                />
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">От</p>
                    <input
                      type="number"
                      value={minInput}
                      onChange={e => setMinInput(e.target.value)}
                      onBlur={applyMinInput}
                      onKeyDown={e => e.key === 'Enter' && applyMinInput()}
                      className="w-full border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent text-center [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <span className="text-muted-foreground mt-4">—</span>
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">До</p>
                    <input
                      type="number"
                      value={maxInput}
                      onChange={e => setMaxInput(e.target.value)}
                      onBlur={applyMaxInput}
                      onKeyDown={e => e.key === 'Enter' && applyMaxInput()}
                      className="w-full border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent text-center [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
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
                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                      <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Поиск по названию..."
                        className="w-full border border-border bg-background pl-9 pr-4 py-2 text-sm outline-none focus:border-accent"
                      />
                      {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent">
                          <Icon name="X" size={14} />
                        </button>
                      )}
                    </div>
                    <select
                      value={sort}
                      onChange={e => setSort(e.target.value)}
                      className="border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent cursor-pointer"
                    >
                      {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">Найдено: {filtered.length}</p>
                  {filtered.length === 0 ? (
                    <div className="py-24 text-center text-muted-foreground">
                      <Icon name="SearchX" size={40} className="mx-auto mb-4 opacity-40" />
                      По выбранным фильтрам ничего не найдено
                    </div>
                  ) : (
                    <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
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

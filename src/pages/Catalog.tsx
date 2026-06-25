import { useState, useMemo, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { SHAPES, SIZES } from '@/data/products';
import Header from '@/components/Header';
import urls from '../../backend/func2url.json';

interface Product {
  id: number;
  name: string;
  description: string;
  shape: string;
  size: string;
  color: string;
  price: number;
  image_url: string;
}

const Catalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [shapes, setShapes] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(900);

  useEffect(() => {
    fetch(urls['products'])
      .then(r => r.json())
      .then(data => {
        setProducts(data.products || []);
        setLoadingProducts(false);
      })
      .catch(() => setLoadingProducts(false));
  }, []);

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const priceMax = products.length ? Math.max(...products.map(p => p.price), 900) : 900;

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (shapes.length === 0 || shapes.includes(p.shape)) &&
          (sizes.length === 0 || sizes.includes(p.size)) &&
          p.price <= maxPrice
      ),
    [products, shapes, sizes, maxPrice]
  );

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
              ) : products.length === 0 ? (
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
                    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filtered.map((p) => (
                        <article key={p.id} className="group bg-card border border-border hover-lift">
                          <div className="overflow-hidden aspect-square">
                            {p.image_url
                              ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              : <div className="w-full h-full bg-secondary flex items-center justify-center"><Icon name="Image" size={48} className="opacity-20" /></div>
                            }
                          </div>
                          <div className="p-5">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[11px] uppercase tracking-wider text-accent border border-accent/40 px-2 py-0.5">{p.shape}</span>
                              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.size}</span>
                              {p.color && <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.color}</span>}
                            </div>
                            <h3 className="font-display text-xl font-semibold mb-1">{p.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{p.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {p.price} ₽<span className="text-xs text-muted-foreground"> / шт</span>
                              </span>
                              <Button size="sm" variant="ghost" className="rounded-none text-accent hover:text-accent hover:bg-accent/10">
                                В заявку <Icon name="ArrowRight" size={14} className="ml-1" />
                              </Button>
                            </div>
                          </div>
                        </article>
                      ))}
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

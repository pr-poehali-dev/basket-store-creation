import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { products, MATERIALS, SIZES, type Product } from '@/data/products';

const Catalog = () => {
  const [materials, setMaterials] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(900);

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (materials.length === 0 || materials.includes(p.material)) &&
          (sizes.length === 0 || sizes.includes(p.size)) &&
          p.price <= maxPrice
      ),
    [materials, sizes, maxPrice]
  );

  const reset = () => {
    setMaterials([]);
    setSizes([]);
    setMaxPrice(900);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 inset-x-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <Icon name="Wheat" className="text-accent" size={26} />
            <span className="font-display text-2xl font-semibold tracking-wide">FABRICA</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors">
            <Icon name="ArrowLeft" size={16} />
            На главную
          </Link>
        </div>
      </header>

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
                <p className="text-sm font-medium mb-3 uppercase tracking-wider text-muted-foreground">Материал</p>
                <div className="space-y-2">
                  {MATERIALS.map((m) => (
                    <label key={m} className="flex items-center gap-3 cursor-pointer group">
                      <span
                        className={`w-4 h-4 border flex items-center justify-center transition-colors ${
                          materials.includes(m) ? 'bg-accent border-accent' : 'border-border group-hover:border-accent'
                        }`}
                      >
                        {materials.includes(m) && <Icon name="Check" size={12} className="text-accent-foreground" />}
                      </span>
                      <input type="checkbox" className="hidden" checked={materials.includes(m)} onChange={() => toggle(materials, setMaterials, m)} />
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
                      <span
                        className={`w-4 h-4 border flex items-center justify-center transition-colors ${
                          sizes.includes(s) ? 'bg-accent border-accent' : 'border-border group-hover:border-accent'
                        }`}
                      >
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
                <Slider value={[maxPrice]} onValueChange={(v) => setMaxPrice(v[0])} min={250} max={900} step={10} />
              </div>
            </aside>

            <div>
              <p className="text-sm text-muted-foreground mb-6">Найдено: {filtered.length}</p>
              {filtered.length === 0 ? (
                <div className="py-24 text-center text-muted-foreground">
                  <Icon name="SearchX" size={40} className="mx-auto mb-4 opacity-40" />
                  По выбранным фильтрам ничего не найдено
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filtered.map((p: Product) => (
                    <article key={p.id} className="group bg-card border border-border hover-lift">
                      <div className="overflow-hidden aspect-square">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] uppercase tracking-wider text-accent border border-accent/40 px-2 py-0.5">{p.material}</span>
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.size}</span>
                        </div>
                        <h3 className="font-display text-xl font-semibold mb-1">{p.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Catalog;

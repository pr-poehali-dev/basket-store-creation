import { useState, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { products, MATERIALS, SIZES, type Product } from '@/data/products';

const NAV = [
  { id: 'home', label: 'Главная' },
  { id: 'catalog', label: 'Каталог' },
  { id: 'about', label: 'О компании' },
  { id: 'wholesale', label: 'Оптовикам' },
  { id: 'delivery', label: 'Доставка' },
  { id: 'contacts', label: 'Контакты' },
];

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

const Index = () => {
  const [materials, setMaterials] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(900);
  const [menuOpen, setMenuOpen] = useState(false);

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
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <button onClick={() => scrollTo('home')} className="flex items-center gap-2">
            <Icon name="Wheat" className="text-accent" size={26} />
            <span className="font-display text-2xl font-semibold tracking-wide">FABRICA</span>
          </button>
          <nav className="hidden md:flex items-center gap-8">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => scrollTo(n.id)}
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                {n.label}
              </button>
            ))}
          </nav>
          <Button onClick={() => scrollTo('contacts')} className="hidden md:inline-flex bg-accent hover:bg-accent/90 text-accent-foreground rounded-none">
            Прайс-лист
          </Button>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? 'X' : 'Menu'} size={24} />
          </button>
        </div>
        {menuOpen && (
          <nav className="md:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-3">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  scrollTo(n.id);
                  setMenuOpen(false);
                }}
                className="text-left text-sm text-muted-foreground hover:text-accent"
              >
                {n.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Hero */}
      <section id="home" className="pt-32 pb-24 px-6">
        <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-6">Оптовое производство</p>
            <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.05] mb-6">
              Плетёные корзины из натуральных материалов
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-md">
              Собственное производство полного цикла. Поставки для розничных сетей, маркетплейсов и HoReCa по всей России.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => scrollTo('catalog')} className="bg-primary hover:bg-primary/90 rounded-none px-8 h-12">
                Смотреть каталог
              </Button>
              <Button onClick={() => scrollTo('wholesale')} variant="outline" className="rounded-none px-8 h-12 border-primary">
                Условия опта
              </Button>
            </div>
          </div>
          <div className="relative animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <img
              src="https://cdn.poehali.dev/projects/d5ee4f52-1455-4c6a-a1d4-6138f3445871/files/22ef5062-c397-42e5-a593-77236d2a1500.jpg"
              alt="Плетёная корзина"
              className="w-full aspect-square object-cover"
            />
            <div className="absolute -bottom-6 -left-6 bg-card border border-border px-6 py-4 shadow-sm">
              <p className="font-display text-3xl font-semibold text-accent">11 лет</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">на рынке</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border py-10 px-6">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { v: '100+', l: 'видов корзин' },
            { v: 'до 400', l: 'корзин создаём ежедневно' },
            { v: '100%', l: 'ручная работа и натуральные материалы' },
            { v: '70+', l: 'регионов полюбили наши изделия' },
          ].map((s) => (
            <div key={s.l}>
              <p className="font-display text-4xl font-semibold mb-1">{s.v}</p>
              <p className="text-sm text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="py-24 px-6">
        <div className="container mx-auto">
          <div className="mb-12 max-w-xl">
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-3">Продукция</p>
            <h2 className="font-display text-5xl font-semibold">Каталог корзин</h2>
          </div>

          <div className="grid lg:grid-cols-[280px_1fr] gap-10">
            {/* Filters */}
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

            {/* Grid */}
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
      </section>

      {/* About */}
      <section id="about" className="py-24 px-6 bg-secondary/40">
        <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
          <img
            src="https://cdn.poehali.dev/projects/d5ee4f52-1455-4c6a-a1d4-6138f3445871/files/a944da5a-4f75-47e3-bf49-f336ddb92630.jpg"
            alt="Производство корзин"
            className="w-full aspect-[4/3] object-cover"
          />
          <div>
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-3">О компании</p>
            <h2 className="font-display text-5xl font-semibold mb-6">Ремесло и масштаб</h2>
            <p className="text-muted-foreground mb-4">
              Мы — производственная мастерская «FABRICA». С 2015 года плетём корзины из ивовой лозы для оптовых покупателей.
            </p>
            <p className="text-muted-foreground mb-8">
              Своё сырьё, контроль качества на каждом этапе и стабильные объёмы поставок — от пробной партии до промышленных тиражей.
            </p>
            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: 'Leaf', t: 'Натуральные материалы' },
                { icon: 'Factory', t: 'Полный цикл производства' },
                { icon: 'ShieldCheck', t: 'Контроль качества' },
                { icon: 'Truck', t: 'Доставка по РФ и СНГ' },
              ].map((f) => (
                <div key={f.t} className="flex items-start gap-3">
                  <Icon name={f.icon} className="text-accent shrink-0 mt-0.5" size={22} />
                  <span className="text-sm">{f.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Wholesale */}
      <section id="wholesale" className="py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-3">Сотрудничество</p>
            <h2 className="font-display text-5xl font-semibold mb-4">Условия оптовой торговли</h2>
            <p className="text-muted-foreground">Гибкая система скидок и индивидуальные условия для постоянных партнёров.</p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[
              { tier: 'Старт', qty: 'от 10 000 ₽', disc: '—', note: 'Базовые оптовые цены' },
              { tier: 'Партнёр', qty: 'от 60 000 ₽', disc: '−16%', note: 'Персональные условия поставок', hl: true },
              { tier: 'Дистрибьютор', qty: 'от 200 000 ₽', disc: '−20%', note: 'Приоритетная отгрузка' },
              { tier: 'Представительство', qty: 'от 500 000 ₽', disc: 'до 40%', note: 'Индивидуальный менеджер' },
            ].map((t) => (
              <div
                key={t.tier}
                className={`p-8 border ${t.hl ? 'border-accent bg-accent/5' : 'border-border bg-card'}`}
              >
                <h3 className="font-display text-2xl font-semibold mb-1">{t.tier}</h3>
                <p className="text-sm text-muted-foreground mb-6">{t.qty}</p>
                <p className="font-display text-5xl font-semibold text-accent mb-6">{t.disc}</p>
                <p className="text-sm text-muted-foreground">{t.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery */}
      <section id="delivery" className="py-24 px-6 bg-secondary/40">
        <div className="container mx-auto">
          <div className="mb-14 max-w-xl">
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-3">Логистика</p>
            <h2 className="font-display text-5xl font-semibold">Доставка</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: 'Truck', t: 'По всей России', d: 'Транспортными компаниями до терминала. Срок 2–7 дней.' },
              { icon: 'Navigation', t: 'Адресная доставка', d: 'Частным грузоперевозчиком до двери склада или магазина. Срок 1–3 дня.' },
              { icon: 'MapPin', t: 'Самовывоз', d: 'Со склада производства.' },
            ].map((d) => (
              <div key={d.t} className="bg-card border border-border p-8">
                <Icon name={d.icon} className="text-accent mb-4" size={28} />
                <h3 className="font-display text-2xl font-semibold mb-2">{d.t}</h3>
                <p className="text-sm text-muted-foreground">{d.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contacts */}
      <section id="contacts" className="py-24 px-6">
        <div className="container mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-3">Связь</p>
            <h2 className="font-display text-5xl font-semibold mb-8">Запросить прайс-лист</h2>
            <div className="space-y-4">
              {[
                { icon: 'Phone', t: '+7 (800) 000-00-00' },
                { icon: 'Mail', t: 'opt@fabrica.ru' },
                { icon: 'MapPin', t: 'г. Москва, ул. Производственная, 5' },
                { icon: 'Clock', t: 'Пн–Пт 9:00–18:00' },
              ].map((c) => (
                <div key={c.t} className="flex items-center gap-3">
                  <Icon name={c.icon} className="text-accent" size={20} />
                  <span>{c.t}</span>
                </div>
              ))}
            </div>
          </div>
          <form className="bg-card border border-border p-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <input className="w-full bg-background border border-border px-4 h-12 outline-none focus:border-accent transition-colors" placeholder="Ваше имя" />
            <input className="w-full bg-background border border-border px-4 h-12 outline-none focus:border-accent transition-colors" placeholder="Телефон или e-mail" />
            <textarea className="w-full bg-background border border-border px-4 py-3 outline-none focus:border-accent transition-colors min-h-28" placeholder="Что вас интересует?" />
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12">
              Отправить заявку
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Icon name="Wheat" className="text-accent" size={22} />
            <span className="font-display text-xl font-semibold">FABRICA</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Производство плетёных корзин. Оптовая торговля.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
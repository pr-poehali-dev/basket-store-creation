import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';

const NAV = [
  { id: 'home', label: 'Главная' },
  { id: 'about', label: 'О компании' },
  { id: 'wholesale', label: 'Оптовикам' },
  { id: 'delivery', label: 'Доставка' },
  { id: 'contacts', label: 'Контакты' },
];

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

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
              <Link to="/catalog">
                <Button className="bg-primary hover:bg-primary/90 rounded-none px-8 h-12">
                  Смотреть каталог
                </Button>
              </Link>
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

          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border py-10 px-6">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
          {[
            { v: '100+', l: 'видов корзин' },
            { v: '70+', l: 'регионов полюбили\nнаши изделия' },
            { v: '11 лет', l: 'на рынке' },
            { v: 'до 400', l: 'корзин создаём ежедневно' },
            { v: '100%', l: 'ручная работа\nи натуральные материалы' },
          ].map((s) => (
            <div key={s.l}>
              <p className="font-display text-4xl font-semibold mb-1">{s.v}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{s.l}</p>
            </div>
          ))}
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
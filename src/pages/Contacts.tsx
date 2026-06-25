import Header from '@/components/Header';

const ADVANTAGES = [
  { num: 1, title: 'Без посредников', desc: 'Мы выращиваем, подготавливаем материал и плетем корзины самостоятельно' },
  { num: 2, title: 'Неограниченный выбор', desc: 'Не нужно выбирать из наличия, закажите столько — сколько нужно именно вам' },
  { num: 3, title: 'Контроль качества', desc: 'На каждом этапе производства следим за качеством и делаем постоянный отбор корзин' },
  { num: 4, title: 'Прочность', desc: 'Выбираем прочные сорта прута и используем фирменные техники плотного плетения' },
];

const Contacts = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-4xl">

          {/* О компании — центрированный hero-блок */}
          <div className="text-center mb-20">
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-4">О нас</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">О компании</h1>
            <p className="text-xl md:text-2xl font-semibold leading-relaxed max-w-3xl mx-auto mb-6">
              «FABRICA» сегодня — это команда мастеров, объединённых любовью к традиционному ремеслу. Мы создаём плетёные корзины из натуральной лозы, сочетая многовековые техники с актуальным дизайном.
            </p>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Собственное производство позволяет нам поставлять экологичную и качественную продукцию для флористов, ритейла и дизайнеров по всей России. Мы ценим ручной труд и в каждое изделие вкладываем частицу души.
            </p>
          </div>

          <div className="border-t border-border mb-20" />

          {/* Преимущества — 2 колонки симметрично */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12">Качество, созданное вручную на всех этапах</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {ADVANTAGES.map(item => (
                <div key={item.num} className="border border-border rounded-xl p-6 flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full border border-border flex items-center justify-center text-accent font-bold">
                    {item.num}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border mb-20" />

          {/* Контакты — симметричная сетка */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12">Контакты</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="border border-border rounded-xl p-6 text-center">
                <p className="text-xs uppercase tracking-wider text-accent mb-3">Адрес</p>
                <p className="font-semibold mb-1">Саратов</p>
                <p className="text-muted-foreground text-sm">ул. Зенитная, д. 25</p>
              </div>
              <div className="border border-border rounded-xl p-6 text-center">
                <p className="text-xs uppercase tracking-wider text-accent mb-3">Время работы</p>
                <p className="font-semibold mb-1">Пн–Пт: 10:00–19:00</p>
                <p className="text-muted-foreground text-sm">Сб–Вс: выходной</p>
              </div>
              <div className="border border-border rounded-xl p-6 text-center">
                <p className="text-xs uppercase tracking-wider text-accent mb-3">Обратная связь</p>
                <a href="mailto:fabrica.64@yandex.ru" className="block font-semibold hover:text-accent transition-colors text-sm mb-1">
                  fabrica.64@yandex.ru
                </a>
                <a href="tel:89271200007" className="block text-muted-foreground hover:text-accent transition-colors text-sm">
                  8 (927) 120-00-07
                </a>
              </div>
            </div>
          </div>

          {/* Подпись */}
          <div className="border-t border-border pt-16 text-center">
            <p className="text-2xl font-bold tracking-wide">ФАБРИКА</p>
            <p className="text-sm tracking-[0.2em] text-muted-foreground">FABRICA</p>
            <p className="text-sm text-muted-foreground mt-4">est. 2015–2026</p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Contacts;

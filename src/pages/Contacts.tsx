import Header from '@/components/Header';

const Contacts = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-3xl">

          {/* О компании */}
          <div className="mb-16">
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-3">О нас</p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold mb-8">О компании</h1>
            <div className="space-y-6">
              <p className="font-display text-2xl md:text-3xl font-semibold leading-tight">
                «FABRICA» сегодня — это команда мастеров, объединенных любовью к традиционному ремеслу. Мы создаем плетеные корзины из натуральной лозы, сочетая многовековые техники с актуальным дизайном.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Собственное производство позволяет нам поставлять экологичную и качественную продукцию для флористов, ритейла и дизайнеров по всей России. Мы ценим ручной труд и в каждое изделие вкладываем частицу души.
              </p>
            </div>
          </div>

          <div className="border-t border-border mb-16" />

          {/* Почему мы */}
          <div className="mb-16">
            <h2 className="font-display text-3xl font-semibold mb-10">Качество, созданное вручную на всех этапах</h2>
            <div className="space-y-8">
              {[
                { num: 1, title: 'Отсутствие посредников и дополнительных наценок', desc: 'Мы выращиваем, подготавливаем материал и плетем корзины самостоятельно' },
                { num: 2, title: 'Неограниченный выбор', desc: 'Не нужно выбирать из наличия, закажите столько — сколько нужно именно вам' },
                { num: 3, title: 'Контроль качества', desc: 'На каждом этапе производства следим за качеством и делаем постоянный отбор корзин' },
                { num: 4, title: 'Прочность', desc: 'Мы выбираем прочные сорта прута, особенно по сравнению с китайскими плантациями и используем фирменные техники плотного плетения' },
              ].map(item => (
                <div key={item.num} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full border border-border flex items-center justify-center">
                    <span className="font-display text-xl font-semibold">{item.num}</span>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border mb-16" />

          {/* Контакты */}
          <div className="mb-16">
            <h2 className="font-display text-3xl font-semibold mb-10">Контакты</h2>
            <div className="grid md:grid-cols-2 gap-10">
              <div>
                <p className="font-display text-xl font-semibold mb-3">Адрес</p>
                <p className="text-muted-foreground">Саратов, ул. Зенитная, д. 25</p>
              </div>
              <div>
                <p className="font-display text-xl font-semibold mb-3">Время работы</p>
                <p className="text-muted-foreground">Пн–Пт: 10:00–19:00</p>
                <p className="text-muted-foreground">Сб–Вс: выходной</p>
              </div>
              <div>
                <p className="font-display text-xl font-semibold mb-3">Обратная связь</p>
                <a href="mailto:fabrica.64@yandex.ru" className="block text-muted-foreground hover:text-accent transition-colors">
                  fabrica.64@yandex.ru
                </a>
                <a href="tel:89271200007" className="block text-muted-foreground hover:text-accent transition-colors mt-1">
                  8 (927) 120-00-07
                </a>
              </div>
            </div>
          </div>

          {/* Футер компании */}
          <div className="border-t border-border pt-16 text-center">
            <p className="font-display text-2xl font-semibold tracking-wide">ФАБРИКА</p>
            <p className="text-sm tracking-[0.2em] text-muted-foreground">FABRICA</p>
            <p className="text-sm text-muted-foreground mt-4">est. 2015–2026</p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Contacts;

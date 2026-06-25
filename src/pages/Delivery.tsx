import Header from '@/components/Header';

const DELIVERY_OPTIONS = [
  {
    num: 1,
    title: 'В пункт выдачи',
    desc: 'Заказы до 20 000 ₽ отправляем ТК КИТ, ПЭК, СДЭК, Деловые линии, Мэджик Транс. Самые выгодные тарифы у ТК КИТ.',
    details: ['Стоимость: ~15–20% от суммы заказа', 'Оплата — при получении в пункте выдачи'],
  },
  {
    num: 2,
    title: 'Адресная доставка',
    desc: 'Заказы от 20 000 ₽ выгоднее отправлять сборным грузом до адреса через официальный сервис ATI.SU.',
    details: ['Стоимость: ~5–10% от суммы заказа', 'Оплата — при получении водителю'],
  },
  {
    num: 3,
    title: 'Самовывоз',
    desc: 'Доступен по адресу г. Саратов, ул. Зенитная, д. 25.',
    details: ['Пн–Пт: 10:00–18:00', 'Сб–Вс: по договорённости'],
  },
  {
    num: 4,
    title: 'Транспортной компанией',
    desc: 'Работаем со всеми популярными способами доставки — выберем наиболее удобный и выгодный вариант вместе с вами.',
    details: ['После оформления заказа менеджер свяжется с вами', 'Поможем выбрать оптимальный вариант'],
  },
];

const Delivery = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-4xl">

          {/* Hero */}
          <div className="text-center mb-16">
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-4">Логистика</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Доставка</h1>
            <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
              Отправляем корзины по всей России. Стоимость зависит от региона и объёма заказа. Менеджер поможет выбрать выгодный вариант.
            </p>
          </div>

          {/* Варианты доставки — 2×2 сетка */}
          <div className="grid md:grid-cols-2 gap-6">
            {DELIVERY_OPTIONS.map(opt => (
              <div key={opt.num} className="border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">
                    {opt.num}
                  </div>
                  <h2 className="font-semibold text-lg">{opt.title}</h2>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{opt.desc}</p>
                <div className="space-y-1">
                  {opt.details.map((d, i) => (
                    <p key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-accent">—</span>
                      {d}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Delivery;

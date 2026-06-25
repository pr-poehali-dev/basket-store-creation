import Header from '@/components/Header';
import Icon from '@/components/ui/icon';

const DELIVERY_OPTIONS = [
  {
    num: 1,
    icon: 'Package',
    title: 'В пункт выдачи',
    desc: 'Заказы до 20 000 ₽ отправляем ТК КИТ, ПЭК, СДЭК, Деловые линии, Мэджик Транс. Самые выгодные тарифы у ТК КИТ.',
    details: ['Стоимость: ~15–20% от суммы заказа', 'Оплата — при получении в пункте выдачи'],
  },
  {
    num: 2,
    icon: 'Truck',
    title: 'Адресная доставка',
    desc: 'Заказы от 20 000 ₽ выгоднее отправлять сборным грузом до адреса через официальный сервис ATI.SU.',
    details: ['Стоимость: ~5–10% от суммы заказа', 'Оплата — при получении водителю'],
  },
  {
    num: 3,
    icon: 'MapPin',
    title: 'Самовывоз',
    desc: 'Доступен по адресу г. Саратов, ул. Зенитная, д. 25.',
    details: ['Пн–Пт: 10:00–18:00', 'Сб–Вс: по договорённости'],
  },
];

const Delivery = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-5xl">

          {/* Hero — текст слева, фото справа */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <p className="text-accent text-sm tracking-[0.3em] uppercase mb-4">Логистика</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Доставляем по всей России</h1>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Отправляем корзины транспортными компаниями, частными грузоперевозчиками или самовывозом — на ваш выбор.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                После оформления заказа менеджер свяжется с вами и поможет выбрать наиболее выгодный вариант доставки.
              </p>
            </div>
            <div className="relative">
              <img
                src="https://cdn.poehali.dev/projects/d5ee4f52-1455-4c6a-a1d4-6138f3445871/files/f51f8391-2560-4a17-9f81-ca1c2bb768dc.jpg"
                alt="Доставка корзин"
                className="w-full aspect-[4/3] object-cover rounded-3xl"
              />
            </div>
          </div>

          {/* Варианты доставки — горизонтальный список */}
          <div className="space-y-6 mb-20">
            {DELIVERY_OPTIONS.map(opt => (
              <div key={opt.num} className="border border-border rounded-3xl p-8 flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex items-center gap-4 md:flex-col md:items-center md:w-24 flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center">
                    <Icon name={opt.icon} size={22} className="text-accent" />
                  </div>
                  <span className="text-xs text-muted-foreground md:text-center">Вариант {opt.num}</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">{opt.title}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">{opt.desc}</p>
                  <div className="flex flex-wrap gap-3">
                    {opt.details.map((d, i) => (
                      <span key={i} className="text-xs bg-secondary px-3 py-1.5 rounded-full text-muted-foreground">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Нижний баннер */}
          <div className="bg-secondary/50 rounded-3xl p-10 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-3">Стоимость доставки уточняется индивидуально</h2>
              <p className="text-muted-foreground leading-relaxed">
                Менеджер свяжется с вами после оформления заказа и рассчитает точную стоимость с учётом региона, габаритов и объёма заказа.
              </p>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-4xl font-bold text-accent">8 (927) 120-00-07</div>
              <p className="text-sm text-muted-foreground mt-1">звоните или пишите</p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Delivery;

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Icon from '@/components/ui/icon';

const SOCIALS = [
  { name: 'ВКонтакте', text: 'ВК', href: 'https://www.vk.com/fabrica_korzin', handle: 'fabrica_korzin' },
  { name: 'Telegram', icon: 'Send', href: 'https://t.me/fabrica_saratov', handle: 'fabrica_saratov' },
  { name: 'Instagram', icon: 'Instagram', href: 'https://www.instagram.com/fabrica_saratov', handle: 'fabrica_saratov' },
];

const ADVANTAGES = [
  { num: 1, icon: 'Sprout', title: 'Без посредников', desc: 'Выращиваем, подготавливаем материал и плетём корзины самостоятельно' },
  { num: 2, icon: 'Infinity', title: 'Неограниченный выбор', desc: 'Не нужно выбирать из наличия — закажите столько, сколько нужно именно вам' },
  { num: 3, icon: 'ShieldCheck', title: 'Контроль качества', desc: 'На каждом этапе производства следим за качеством и делаем постоянный отбор' },
  { num: 4, icon: 'Hammer', title: 'Прочность', desc: 'Выбираем прочные сорта прута и используем фирменные техники плотного плетения' },
];

const Contacts = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-0 px-6">
        <div className="container mx-auto max-w-5xl">

          {/* Hero — крупная цитата + фото */}
          <div className="grid md:grid-cols-5 gap-12 items-center mb-24">
            <div className="md:col-span-3">
              <p className="text-accent text-sm tracking-[0.3em] uppercase mb-5">О нас</p>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-8">
                Ремесло,<br />которое живёт
              </h1>
              <p className="text-xl font-semibold leading-relaxed mb-4">
                «FABRICA» — команда мастеров, объединённых любовью к традиционному ремеслу. Создаём плетёные корзины из натуральной лозы, сочетая многовековые техники с актуальным дизайном.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Собственное производство позволяет поставлять экологичную и качественную продукцию для флористов, ритейла и дизайнеров по всей России.
              </p>
            </div>
            <div className="md:col-span-2">
              <img
                src="https://cdn.poehali.dev/projects/d5ee4f52-1455-4c6a-a1d4-6138f3445871/files/9795083f-43e9-4777-9ce5-b2fe7a649051.jpg"
                alt="Производство FABRICA"
                className="w-full aspect-[3/4] object-cover rounded-3xl"
              />
            </div>
          </div>

          {/* Преимущества — горизонтальная лента */}
          <div className="bg-secondary/40 rounded-3xl p-10 mb-24">
            <h2 className="text-3xl font-bold mb-10">Качество на всех этапах</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {ADVANTAGES.map(item => (
                <div key={item.num} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Icon name={item.icon} size={18} className="text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Фото производства на всю ширину */}
          <div className="relative rounded-3xl overflow-hidden mb-24">
            <img
              src="https://cdn.poehali.dev/projects/d5ee4f52-1455-4c6a-a1d4-6138f3445871/files/e76b26a1-3bb3-4205-9d7a-9744468c0e10.jpg"
              alt="Производство корзин"
              className="w-full aspect-[21/9] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent flex items-center p-12">
              <div className="text-white max-w-sm">
                <p className="text-3xl font-bold mb-3">С 2015 года</p>
                <p className="text-base opacity-80 leading-relaxed">Делаем корзины из натуральной ивовой лозы для оптовых покупателей по всей России</p>
              </div>
            </div>
          </div>

          {/* Наши соцсети */}
          <div className="mb-24">
            <h2 className="text-4xl font-bold mb-12">Наши соцсети</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {SOCIALS.map(s => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-border rounded-3xl p-8 flex items-center gap-4 hover:border-accent transition-colors group"
                >
                  <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/25 transition-colors">
                    {s.text
                      ? <span className="text-accent font-semibold">{s.text}</span>
                      : <Icon name={s.icon!} size={20} className="text-accent" />}
                  </div>
                  <div>
                    <p className="font-semibold group-hover:text-accent transition-colors">{s.name}</p>
                    <p className="text-muted-foreground text-sm mt-0.5">@{s.handle}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Контакты */}
          <div className="pb-24">
            <h2 className="text-4xl font-bold mb-12">Контакты</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="border border-border rounded-3xl p-8">
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center mb-4">
                  <Icon name="MapPin" size={18} className="text-accent" />
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Адрес</p>
                <p className="font-semibold">Саратов</p>
                <p className="text-muted-foreground text-sm mt-1">ул. Зенитная, д. 25</p>
              </div>
              <div className="border border-border rounded-3xl p-8">
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center mb-4">
                  <Icon name="Clock" size={18} className="text-accent" />
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Время работы</p>
                <p className="font-semibold">Пн–Пт: 10:00–18:00</p>
                <p className="text-muted-foreground text-sm mt-1">Сб–Вс: выходной</p>
              </div>
              <div className="border border-border rounded-3xl p-8">
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center mb-4">
                  <Icon name="MessageCircle" size={18} className="text-accent" />
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Обратная связь</p>
                <a href="mailto:fabrica.64@yandex.ru" className="block font-semibold hover:text-accent transition-colors text-sm">
                  fabrica.64@yandex.ru
                </a>
                <a href="tel:89271200007" className="block text-muted-foreground hover:text-accent transition-colors text-sm mt-1">
                  8 (927) 120-00-07
                </a>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contacts;
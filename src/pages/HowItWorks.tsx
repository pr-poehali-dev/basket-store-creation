import Header from '@/components/Header';
import Footer from '@/components/Footer';

const STEPS = [
  {
    num: 1,
    title: 'Оформление заказа',
    desc: 'Выберите нужные позиции в каталоге и оформите заказ на сайте — это займёт несколько минут',
  },
  {
    num: 2,
    title: 'Обсуждение деталей',
    desc: 'Прежде чем принять заказ, наши специалисты свяжутся с вами для уточнения деталей и консультации по срокам, доставке и другим возникшим вопросам',
  },
  {
    num: 3,
    title: 'Оплата',
    desc: 'Запускаем заказ в работу по 100% предоплате. Работаем как с физ., так и с юр. лицами',
  },
  {
    num: 4,
    title: 'Производство',
    desc: 'В течение обговоренного срока плетём, красим и упаковываем ваш заказ. По готовности высылаем фото',
  },
  {
    num: 5,
    title: 'Доставка',
    desc: 'Транспортной компанией, частным грузоперевозчиком или самовывозом — как вам удобнее',
  },
  {
    num: 6,
    title: 'Остаёмся на связи',
    desc: 'После доставки остаёмся на связи и при возникновении любого вопроса всегда поможем',
  },
];

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-5xl">

          {/* Hero */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <p className="text-accent text-sm tracking-[0.3em] uppercase mb-4">Процесс</p>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
                Как мы работаем
              </h1>
              <p className="text-muted-foreground leading-relaxed text-lg">
                От заявки до доставки — прозрачно, быстро и с полным контролем качества на каждом этапе.
              </p>
            </div>
            <div>
              <img
                src="https://cdn.poehali.dev/projects/d5ee4f52-1455-4c6a-a1d4-6138f3445871/files/9795083f-43e9-4777-9ce5-b2fe7a649051.jpg"
                alt="Плетение корзин"
                className="w-full aspect-square object-cover rounded-3xl"
              />
            </div>
          </div>

          {/* Шаги */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="border border-border rounded-3xl p-8 flex flex-col"
              >
                <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center text-accent font-bold text-lg mb-5">
                  {step.num}
                </div>
                <h2 className="text-xl font-semibold mb-3">{step.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Нижнее фото с подписью */}
          <div className="relative rounded-3xl overflow-hidden">
            <img
              src="https://cdn.poehali.dev/projects/d5ee4f52-1455-4c6a-a1d4-6138f3445871/files/e76b26a1-3bb3-4205-9d7a-9744468c0e10.jpg"
              alt="Производство корзин"
              className="w-full aspect-[21/9] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-10">
              <div className="text-white max-w-lg">
                <p className="text-2xl font-bold mb-2">Собственное производство с 2015 года</p>
                <p className="text-sm opacity-80">Контролируем качество на каждом этапе — от заготовки лозы до упаковки</p>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorks;
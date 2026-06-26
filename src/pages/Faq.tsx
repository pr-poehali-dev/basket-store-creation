import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Icon from '@/components/ui/icon';

const FAQS = [
  {
    question: 'Как производится оплата?',
    answer: (
      <p className="text-sm text-muted-foreground leading-relaxed">
        Оплата производится по счету как для физических, так и для юридических лиц. Также для удобства доступна оплата по QR-коду
      </p>
    ),
  },
  {
    question: 'Работаете с юр. лицами?',
    answer: (
      <p className="text-sm text-muted-foreground leading-relaxed">
        <strong>Да</strong>, мы работаем как с юр. лицами. Оплата осуществляется по счету без НДС. Вместе с заказом отправляем оригинал закрывающих документов
      </p>
    ),
  },
  {
    question: 'Как осуществляется доставка?',
    answer: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="font-semibold text-foreground">В пункт выдачи</p>
          <p>Заказы до 30 000₽ отправляем ТК КИТ, ПЭК, СДЭК, Деловые линии, Мэджик Транс. Самые выгодные тарифы для нашего типа товара у ТК КИТ.</p>
          <p className="mt-1"><span className="underline">Стоимость доставки</span> ~ 10–20% от суммы заказа.</p>
          <p><span className="underline">Оплата доставки</span> — при получении в пункте выдачи.</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Адресная доставка частным грузоперевозчиком</p>
          <p>Заказы от 30 000₽ выгоднее отправлять сборным грузом до адреса через официальный сервис ATI.SU.</p>
          <p className="mt-1"><span className="underline">Стоимость доставки</span> ~ 5–10% от суммы заказа. Чем больше заказ, тем меньше процент.</p>
          <p><span className="underline">Оплата доставки</span> — при получении водителю.</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Самовывоз</p>
          <p>Доступен по адресу г. Саратов, ул. Зенитная, д. 25.</p>
          <p>Пн–Пт: 10:00–18:00</p>
          <p>Сб–Вс: По договорённости</p>
        </div>
      </div>
    ),
  },
  {
    question: 'Есть товар в наличии?',
    answer: (
      <p className="text-sm text-muted-foreground leading-relaxed">
        Все позиции изготавливаются под заказ клиента, в нужном вам количестве и цвете
      </p>
    ),
  },
  {
    question: 'Какие сроки изготовления?',
    answer: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p><strong>Срок изготовления зависит от объема заказа</strong>, а именно от выбранных позиций, количества и цвета корзин. В среднем это 3–5 дней. Точную длительность изготовления можно уточнить при формировании заказа</p>
        <p><strong>Перед праздниками сроки увеличиваются</strong> из-за большого потока клиентов. Поэтому просим делать заказы заранее, чтобы мы точно успели к нужной вам дате. Также работаем по предзаказам по предоплате в 50%</p>
      </div>
    ),
  },
  {
    question: 'Какая минимальная сумма заказа?',
    answer: (
      <p className="text-sm text-muted-foreground">
        Минимальная сумма заказа <strong>10 000 рублей</strong>
      </p>
    ),
  },
  {
    question: 'Можно ли заказать все корзины по 1шт?',
    answer: (
      <p className="text-sm text-muted-foreground leading-relaxed">
        Да, вы можете сделать заказ с любым наполнением, <strong>ограничений по минимальному количеству корзин нет</strong>. Главное сделать заказ на сумму не менее 10 000 рублей
      </p>
    ),
  },
  {
    question: 'Какие есть скидки?',
    answer: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <div>
          <p className="font-semibold text-foreground">скидка 16%</p>
          <p>При заказе от 60 000 рублей</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">скидка 20%</p>
          <p>При заказе от 200 000 рублей</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">индивидуальные условия</p>
          <p>При заказе от 500 000 рублей</p>
        </div>
      </div>
    ),
  },
  {
    question: 'Розница есть?',
    answer: (
      <p className="text-sm text-muted-foreground leading-relaxed">
        Нет, мы занимаемся только оптовыми продажами. Минимальная сумма заказа — 10 000 рублей
      </p>
    ),
  },
];

const Faq = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    setOpenIndex(prev => (prev === i ? null : i));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-5xl">

          {/* Hero — фото слева, текст справа */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div className="relative">
              <img
                src="https://cdn.poehali.dev/projects/d5ee4f52-1455-4c6a-a1d4-6138f3445871/files/4187519b-09d8-4273-a90f-2a8b3d4665b0.jpg"
                alt="Корзины FABRICA"
                className="w-full aspect-square object-cover rounded-3xl"
              />
            </div>
            <div>
              <p className="text-accent text-sm tracking-[0.3em] uppercase mb-4">Часто спрашивают</p>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">Вопрос-ответ</h1>
              <p className="text-muted-foreground leading-relaxed">
                Собрали ответы на самые популярные вопросы о заказе, доставке, оплате и производстве.
              </p>
            </div>
          </div>

          <div className="max-w-3xl mx-auto divide-y divide-border">
            {FAQS.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between py-6 text-left gap-4"
                >
                  <span className="text-xl font-semibold">{faq.question}</span>
                  <Icon
                    name={openIndex === i ? 'X' : 'Plus'}
                    size={20}
                    className="flex-shrink-0 text-muted-foreground transition-transform"
                  />
                </button>
                {openIndex === i && (
                  <div className="pb-6">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};


export default Faq;
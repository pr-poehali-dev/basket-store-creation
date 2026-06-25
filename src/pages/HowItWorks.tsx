import Header from '@/components/Header';

const STEPS = [
  {
    num: 1,
    title: 'Оформление заказа',
    desc: '',
  },
  {
    num: 2,
    title: 'Обсуждение деталей',
    desc: 'Прежде чем принять заказ, наши специалисты свяжутся с вами для уточнения деталей и консультации по срокам, доставке и другим возникшим вопросам',
  },
  {
    num: 3,
    title: 'Оплата',
    desc: 'Запускаем заказ в работу по 100% предоплате\nРаботаем как с физ., так и с юр. лицами',
  },
  {
    num: 4,
    title: 'Производство',
    desc: 'В течение обговоренного срока плетем, красим и упаковываем ваш заказ\nПо готовности высылаем фото',
  },
  {
    num: 5,
    title: 'Доставка',
    desc: 'Транспортной компанией, частным грузоперевозчиком или самовывозом',
  },
];

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-12">
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-3">Как мы работаем</p>
            <h1 className="text-4xl md:text-5xl font-semibold">Этапы работ</h1>
          </div>

          <div className="relative">
            {/* Вертикальная линия */}
            <div className="absolute left-[28px] top-10 bottom-10 w-px bg-border" />

            <div className="space-y-0">
              {STEPS.map((step, i) => (
                <div key={step.num} className="flex gap-8 relative">
                  {/* Круг с номером */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-full border border-border bg-background flex items-center justify-center z-10">
                    <span className="text-xl font-semibold text-foreground">{step.num}</span>
                  </div>

                  {/* Контент */}
                  <div className={`pb-14 pt-3 flex-1 ${i === STEPS.length - 1 ? 'pb-0' : ''}`}>
                    <h2 className="text-2xl font-semibold mb-2">{step.title}</h2>
                    {step.desc && (
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{step.desc}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HowItWorks;
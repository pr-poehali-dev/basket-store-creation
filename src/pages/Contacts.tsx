import Header from '@/components/Header';
import Icon from '@/components/ui/icon';

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
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                FABRICA — собственное производство плетёных корзин из натуральных материалов полного цикла. Мы работаем для розничных сетей, маркетплейсов и HoReCa по всей России.
              </p>
              <p>
                Каждая корзина изготавливается вручную под заказ клиента в нужном количестве и цвете. Контролируем качество на каждом этапе — от заготовки материала до упаковки готового изделия.
              </p>
              <p>
                Работаем как с физическими, так и с юридическими лицами. Оплата по 100% предоплате, выставляем счет на юр/физ лицо.
              </p>
            </div>
          </div>

          {/* Разделитель */}
          <div className="border-t border-border mb-16" />

          {/* Контактные данные */}
          <div>
            <p className="text-accent text-sm tracking-[0.3em] uppercase mb-3">Связаться</p>
            <h2 className="font-display text-3xl font-semibold mb-8">Контакты</h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 border border-border flex items-center justify-center flex-shrink-0">
                  <Icon name="MapPin" size={18} className="text-accent" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Адрес</p>
                  <p className="text-sm">г. Саратов, ул. Зенитная, д. 25</p>
                  <p className="text-xs text-muted-foreground mt-1">Пн–Пт: 10:00–18:00 · Сб–Вс: по договорённости</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 border border-border flex items-center justify-center flex-shrink-0">
                  <Icon name="Phone" size={18} className="text-accent" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Телефон</p>
                  <a href="tel:+78452000000" className="text-sm hover:text-accent transition-colors">+7 (845) 200-00-00</a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 border border-border flex items-center justify-center flex-shrink-0">
                  <Icon name="Mail" size={18} className="text-accent" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Email</p>
                  <a href="mailto:info@fabrica.ru" className="text-sm hover:text-accent transition-colors">info@fabrica.ru</a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 border border-border flex items-center justify-center flex-shrink-0">
                  <Icon name="MessageCircle" size={18} className="text-accent" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Мессенджеры</p>
                  <p className="text-sm">WhatsApp, Telegram</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Contacts;

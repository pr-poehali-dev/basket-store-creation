import Header from '@/components/Header';

const Delivery = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-5xl">

          <div className="grid md:grid-cols-2 gap-16 mb-20">
            {/* Левая колонка */}
            <div>
              <h1 className="font-display text-5xl font-semibold mb-8">Доставка</h1>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Мы отправляем корзины по всей России. Стоимость доставки зависит от региона и объема заказа.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Когда оформите заказ, наш менеджер свяжется с вами и сориентирует по более выгодному варианту, а также уточнит детали для доставки.
              </p>
            </div>

            {/* Правая колонка */}
            <div className="space-y-10">
              <div>
                <h2 className="font-display text-xl font-semibold mb-3">В пункт выдачи</h2>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Заказы до 20 000₽ отправляем ТК КИТ, ПЭК, СДЭК, Деловые линии, Мэджик Транс. Самые выгодные тарифы для нашего типа товара у ТК КИТ.
                </p>
                <p className="text-muted-foreground text-sm mt-2">Стоимость доставки ~ 15–20% от суммы заказа.</p>
                <p className="text-muted-foreground text-sm">Оплата доставки — при получении в пункте выдачи.</p>
              </div>

              <div>
                <h2 className="font-display text-xl font-semibold mb-3">Адресная доставка частным грузоперевозчиком</h2>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Заказы от 20 000₽ выгоднее отправлять сборным грузом до адреса через официальный сервис ATI.SU.
                </p>
                <p className="text-muted-foreground text-sm mt-2">Стоимость доставки ~ 5–10% от суммы заказа. Чем больше заказ, тем меньше процент.</p>
                <p className="text-muted-foreground text-sm">Оплата доставки — при получении водителю.</p>
              </div>

              <div>
                <h2 className="font-display text-xl font-semibold mb-3">Самовывоз</h2>
                <p className="text-muted-foreground text-sm">Доступен по адресу г. Саратов, ул. Зенитная, д. 25.</p>
                <p className="text-muted-foreground text-sm">Пн–Пт: 10:00–18:00</p>
                <p className="text-muted-foreground text-sm">Сб–Вс: По договорённости</p>
              </div>

              <div>
                <h2 className="font-display text-xl font-semibold mb-3">Транспортной компанией, частным грузоперевозчиком или самовывозом</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Мы работаем со всеми популярными способами доставки — выберем наиболее удобный и выгодный вариант вместе с вами после оформления заказа.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Delivery;

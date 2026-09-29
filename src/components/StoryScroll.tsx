import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CDN = 'https://cdn.poehali.dev/projects/d5ee4f52-1455-4c6a-a1d4-6138f3445871';

const frames = [
  {
    img: `${CDN}/bucket/12c6840a-d0e8-4115-b262-9c0489bc666d.JPG`,
    label: 'Начало',
    title: 'Всё начинается с семени',
    text: 'Ивовый черенок ложится в тёплую землю — первый шаг длинного пути к корзине.',
  },
  {
    img: `${CDN}/bucket/710cd599-9779-47cf-9003-80785cb0c668.JPG`,
    label: 'Корни',
    title: 'Корень уходит вглубь',
    text: 'Пока на поверхности только два листа, под землёй уже выстраивается опора на годы вперёд.',
  },
  {
    img: `${CDN}/bucket/df4b7996-0818-4284-9568-e94c026ec278.JPG`,
    label: 'Рост',
    title: 'Ивовая плантация',
    text: 'Через сезон поле поднимается стеной прямых гибких прутьев — наш собственный материал.',
  },
  {
    img: `${CDN}/files/619759e8-e673-4caa-af18-d7db077c5bc0.jpg`,
    label: 'Срезка',
    title: 'Прут срезают вручную',
    text: 'Только ровные однолетние побеги — их отбирают по одному, на глаз и на ощупь.',
  },
  {
    img: `${CDN}/files/f5f6a2d8-e9a8-47fb-bb4b-b0e7bb37d941.jpg`,
    label: 'Дорога',
    title: 'С поля — в мастерскую',
    text: 'Вязанки свежей лозы отправляются под крышу, где начинается обработка.',
  },
  {
    img: `${CDN}/files/b81c5e1f-6398-4803-8216-ee6a03d67114.jpg`,
    label: 'Обработка',
    title: 'Очистка от листьев и коры',
    text: 'Прут проходит через щемилку и становится чистым, светлым и податливым.',
  },
  {
    img: `${CDN}/files/92f2db59-8cff-4050-b638-6e68cd412eea.jpg`,
    label: 'Лента',
    title: 'Прут расщепляют на ленты',
    text: 'Из одного побега получается несколько тонких лент — основа будущего плетения.',
  },
  {
    img: `${CDN}/files/d6b31df7-e024-45b8-8136-4ff4fab1b7e0.jpg`,
    label: 'Плетение',
    title: 'Руки мастера',
    text: 'Ряд за рядом лента ложится в форму. Ни одного станка — только ремесло.',
  },
  {
    img: `${CDN}/bucket/4b305ee6-f219-4fca-9070-680b3aa4be0f.JPG`,
    label: 'Изделие',
    title: 'Готовая корзина',
    text: 'От семени до вещи, которая живёт десятилетиями. Так мы делаем каждую.',
  },
];

const StoryScroll = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const p = Math.min(Math.max(-rect.top / total, 0), 1);
        setProgress(p * (frames.length - 1));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const active = Math.round(progress);
  const last = frames.length - 1;

  return (
    <div ref={ref} style={{ height: `${frames.length * 110}vh` }} className="relative">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-[#0d0f0c]">
        {frames.map((f, i) => {
          const d = progress - i;
          const ad = Math.abs(d);
          if (ad > 1.4) return null;
          const opacity = Math.max(0, 1 - Math.pow(Math.min(ad, 1), 1.4) * 1.25);
          const scale = 1.16 - Math.min(ad, 1) * 0.1;
          return (
            <img
              key={f.img}
              src={f.img}
              alt={f.title}
              loading={i < 2 ? 'eager' : 'lazy'}
              className="absolute inset-0 h-full w-full object-cover will-change-transform"
              style={{
                opacity,
                transform: `scale(${scale}) translate3d(0, ${d * -3.5}%, 0)`,
                filter: `brightness(${0.92 - Math.min(ad, 1) * 0.15}) saturate(0.92)`,
              }}
            />
          );
        })}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d0f0c] via-[#0d0f0c]/15 to-[#0d0f0c]/55" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: 'inset 0 0 220px 60px rgba(0,0,0,0.55)' }}
        />

        <div className="absolute inset-0 flex items-end md:items-center">
          <div className="container mx-auto px-6 pb-28 md:pb-0">
            <div className="relative max-w-xl">
              {frames.map((f, i) => {
                const d = progress - i;
                const ad = Math.abs(d);
                const opacity = Math.max(0, 1 - Math.pow(Math.min(ad, 1), 1.2) * 2.2);
                if (ad > 1) return null;
                return (
                  <div
                    key={f.title}
                    className={i === 0 ? '' : 'absolute inset-x-0 top-0'}
                    style={{
                      opacity,
                      transform: `translate3d(0, ${d * 42}px, 0)`,
                      pointerEvents: opacity > 0.5 ? 'auto' : 'none',
                    }}
                  >
                    <p className="text-white/60 text-[11px] tracking-[0.4em] uppercase mb-5">
                      {String(i + 1).padStart(2, '0')} / {String(frames.length).padStart(2, '0')} — {f.label}
                    </p>
                    <h2 className="text-white text-[2rem] sm:text-5xl md:text-6xl font-semibold leading-[1.03] mb-4 [text-shadow:0_2px_40px_rgba(0,0,0,0.5)]">
                      {f.title}
                    </h2>
                    <p className="text-white/75 text-base sm:text-lg max-w-md leading-relaxed">{f.text}</p>
                    {i === last && (
                      <div className="mt-8 flex flex-wrap gap-3">
                        <Link to="/catalog">
                          <Button className="bg-white text-[#0d0f0c] hover:bg-white/90 px-8 h-12 rounded-full">
                            Смотреть каталог
                          </Button>
                        </Link>
                        <Link to="/how-it-works">
                          <Button
                            variant="outline"
                            className="px-8 h-12 rounded-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                          >
                            Как мы работаем
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="absolute right-5 sm:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          {frames.map((f, i) => (
            <span
              key={f.label}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === active ? 'bg-white w-7' : 'bg-white/30 w-1.5'
              }`}
            />
          ))}
        </div>

        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-white/10">
          <div
            className="h-full bg-white/70"
            style={{ width: `${(progress / last) * 100}%` }}
          />
        </div>

        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-500"
          style={{ opacity: progress < 0.25 ? 1 : 0 }}
        >
          <span className="text-white/60 text-[10px] tracking-[0.35em] uppercase">Листайте</span>
          <span className="block h-8 w-px bg-white/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default StoryScroll;
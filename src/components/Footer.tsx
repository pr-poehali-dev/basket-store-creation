import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const SOCIALS = [
  { icon: 'Send',          href: 'https://t.me/fabrica_saratov',             label: 'Telegram' },
  { icon: 'MessageCircle', href: 'https://wa.me/79063013620',                label: 'WhatsApp' },
  { icon: 'Instagram',     href: 'https://www.instagram.com/fabrica_saratov', label: 'Instagram' },
  { text: 'ВК',            href: 'https://www.vk.com/fabrica_korzin',         label: 'ВКонтакте' },
  { icon: 'Mail',          href: 'mailto:fabrica.64@yandex.ru',              label: 'Почта' },
  { icon: 'Phone',         href: 'tel:+79271200007',                         label: 'Телефон' },
];

const Footer = () => (
  <footer className="border-t border-border py-10 px-6">
    <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
      {/* Лого */}
      <div className="flex items-center gap-2">
        <Icon name="Wheat" className="text-accent" size={22} />
        <div className="flex flex-col" style={{ gap: '1px', lineHeight: 1 }}>
          <span className="font-semibold tracking-widest text-base">ФАБРИКА</span>
          <span className="text-xs tracking-[0.2em] text-muted-foreground">FABRICA</span>
        </div>
      </div>

      {/* Соцсети */}
      <div className="flex items-center gap-3">
        {SOCIALS.map(s => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            title={s.label}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-accent hover:border-accent transition-colors"
          >
            {s.text
              ? <span className="text-sm font-semibold">{s.text}</span>
              : <Icon name={s.icon!} size={18} />}
          </a>
        ))}
      </div>

      {/* Реквизиты */}
      <div className="text-center md:text-right text-sm text-muted-foreground space-y-1">
        <p>© 2015–2026 FABRICA</p>
        <p>ИП Акимов Валерий Евгеньевич</p>
        <p>
          Все права защищены
          {' · '}
          <Link to="/admin" className="hover:text-accent transition-colors">Вход</Link>
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
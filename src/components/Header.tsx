import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';

const NAV_LINKS = [
  { label: 'Этапы работ', to: '/how-it-works' },
  { label: 'Доставка', to: '/delivery' },
  { label: 'Вопрос-ответ', to: '/faq' },
  { label: 'Контакты', to: '/contacts' },
];

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { totalCount } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const overStory = location.pathname === '/' && !scrolled && !menuOpen;
  const linkClass = overStory
    ? 'text-sm text-white/80 hover:text-white transition-colors'
    : 'text-sm text-muted-foreground hover:text-accent transition-colors';
  const iconClass = overStory
    ? 'relative p-2 text-white/80 hover:text-white transition-colors'
    : 'relative p-2 text-muted-foreground hover:text-accent transition-colors';

  const handlePriceList = () => {
    navigate('/contacts');
    setMenuOpen(false);
  };

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-colors duration-500 ${overStory ? 'bg-transparent border-b border-white/10' : 'bg-background/85 backdrop-blur-md border-b border-border'}`}>
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center gap-2">
          <Icon name="Wheat" className={overStory ? 'text-white' : 'text-accent'} size={26} />
          <div className={`flex flex-col ${overStory ? 'text-white' : ''}`} style={{gap: '1px', lineHeight: 1}}>
            <span className="font-semibold tracking-widest text-base">ФАБРИКА</span>
            <span className={`text-xs tracking-[0.2em] ${overStory ? 'text-white/70' : 'text-muted-foreground'}`}>FABRICA</span>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className={linkClass}>
            Главная
          </Link>
          <Link to="/catalog" className={linkClass}>
            Каталог
          </Link>
          {NAV_LINKS.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={linkClass}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/cart" className={iconClass}>
            <Icon name="ShoppingCart" size={22} />
            {totalCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center rounded-full px-1">
                {totalCount}
              </span>
            )}
          </Link>
          <Button
            onClick={handlePriceList}
            className={overStory ? 'bg-white text-[#0d0f0c] hover:bg-white/90' : 'bg-accent hover:bg-accent/90 text-accent-foreground'}
          >
            Прайс-лист
          </Button>
        </div>
        <div className="md:hidden flex items-center gap-2">
          <Link to="/cart" className={iconClass}>
            <Icon name="ShoppingCart" size={22} />
            {totalCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center rounded-full px-1">
                {totalCount}
              </span>
            )}
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? 'X' : 'Menu'} size={24} className={overStory ? 'text-white' : ''} />
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="md:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-3">
          <Link to="/" onClick={() => setMenuOpen(false)} className="text-left text-sm text-muted-foreground hover:text-accent">
            Главная
          </Link>
          <Link to="/catalog" onClick={() => setMenuOpen(false)} className="text-left text-sm text-muted-foreground hover:text-accent">
            Каталог
          </Link>
          {NAV_LINKS.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setMenuOpen(false)}
              className="text-left text-sm text-muted-foreground hover:text-accent"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};

export default Header;
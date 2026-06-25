import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const { totalCount } = useCart();

  const handlePriceList = () => {
    navigate('/contacts');
    setMenuOpen(false);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center gap-2">
          <Icon name="Wheat" className="text-accent" size={26} />
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-semibold tracking-widest">ФАБРИКА</span>
            <span className="font-display text-sm tracking-[0.2em] text-muted-foreground">FABRICA</span>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-accent transition-colors">
            Главная
          </Link>
          <Link to="/catalog" className="text-sm text-muted-foreground hover:text-accent transition-colors">
            Каталог
          </Link>
          {NAV_LINKS.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/cart" className="relative p-2 text-muted-foreground hover:text-accent transition-colors">
            <Icon name="ShoppingCart" size={22} />
            {totalCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center rounded-full px-1">
                {totalCount}
              </span>
            )}
          </Link>
          <Button
            onClick={handlePriceList}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-none"
          >
            Прайс-лист
          </Button>
        </div>
        <div className="md:hidden flex items-center gap-2">
          <Link to="/cart" className="relative p-2 text-muted-foreground hover:text-accent transition-colors">
            <Icon name="ShoppingCart" size={22} />
            {totalCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center rounded-full px-1">
                {totalCount}
              </span>
            )}
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? 'X' : 'Menu'} size={24} />
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
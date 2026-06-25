import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

const NAV = [
  { id: 'about', label: 'О компании' },
  { id: 'wholesale', label: 'Оптовикам' },
  { id: 'delivery', label: 'Доставка' },
  { id: 'contacts', label: 'Контакты' },
];

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (id: string) => {
    setMenuOpen(false);
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/#${id}`);
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center gap-2">
          <Icon name="Wheat" className="text-accent" size={26} />
          <span className="font-display text-2xl font-semibold tracking-wide">FABRICA</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-accent transition-colors">
            Главная
          </Link>
          <Link to="/catalog" className="text-sm text-muted-foreground hover:text-accent transition-colors">
            Каталог
          </Link>
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNavClick(n.id)}
              className="text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              {n.label}
            </button>
          ))}
        </nav>
        <Button
          onClick={() => handleNavClick('contacts')}
          className="hidden md:inline-flex bg-accent hover:bg-accent/90 text-accent-foreground rounded-none"
        >
          Прайс-лист
        </Button>
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
          <Icon name={menuOpen ? 'X' : 'Menu'} size={24} />
        </button>
      </div>
      {menuOpen && (
        <nav className="md:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-3">
          <Link to="/" onClick={() => setMenuOpen(false)} className="text-left text-sm text-muted-foreground hover:text-accent">
            Главная
          </Link>
          <Link to="/catalog" onClick={() => setMenuOpen(false)} className="text-left text-sm text-muted-foreground hover:text-accent">
            Каталог
          </Link>
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNavClick(n.id)}
              className="text-left text-sm text-muted-foreground hover:text-accent"
            >
              {n.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
};

export default Header;

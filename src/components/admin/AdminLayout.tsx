import { useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';

const NAV = [
  { label: 'Заказы',        path: '/admin/orders' },
  { label: 'Календарь',     path: '/admin/calendar' },
  { label: 'Производство',  path: '/admin/production' },
  { label: 'Малярка',       path: '/admin/painting' },
  { label: 'База клиентов', path: '/admin/clients' },
  { label: 'Поступления',   path: '/admin/income' },
  { label: 'Товары',        path: '/admin/products' },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_ok') === '1');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const login = async () => {
    setAuthLoading(true); setAuthError('');
    const res = await fetch(urls['admin-auth'], {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setAuthLoading(false);
    if (data.ok) { sessionStorage.setItem('admin_ok', '1'); setAuthed(true); }
    else setAuthError('Неверный пароль');
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8">
            <Icon name="Wheat" className="text-accent" size={26} />
            <span className="font-display text-2xl font-semibold">FABRICA</span>
          </div>
          <h1 className="font-display text-3xl font-semibold mb-6">Вход в админку</h1>
          <input type="password" placeholder="Пароль" value={password}
            onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
            className="w-full border border-border bg-background px-4 py-3 text-sm mb-3 outline-none focus:border-accent rounded-xl" />
          {authError && <p className="text-red-500 text-sm mb-3">{authError}</p>}
          <Button onClick={login} disabled={authLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-11 rounded-xl">
            {authLoading ? 'Проверяю...' : 'Войти'}
          </Button>
        </div>
      </div>
    );
  }

  const isActive = (path: string) =>
    location.pathname === path || (path === '/admin/orders' && location.pathname === '/admin');

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Левое меню */}
      <aside className="w-56 flex-shrink-0 border-r border-border min-h-screen px-4 py-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 px-2">
          <Icon name="Wheat" className="text-accent" size={22} />
          <span className="font-display text-xl font-semibold text-primary">FABRICA</span>
        </div>

        <nav className="flex flex-col gap-3">
          {NAV.map(item => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={[
                  'w-full text-center font-semibold py-2.5 rounded-xl border transition-colors',
                  active
                    ? 'bg-accent text-primary border-accent'
                    : 'bg-background text-primary border-primary/40 hover:border-primary',
                ].join(' ')}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2 px-1">
          <a href="/" className="text-sm text-muted-foreground hover:text-accent">На сайт</a>
          <button
            onClick={() => { sessionStorage.removeItem('admin_ok'); setAuthed(false); }}
            className="text-sm text-muted-foreground hover:text-accent text-left"
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* Контент */}
      <main className="flex-1 min-w-0 overflow-x-auto">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;

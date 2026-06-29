import { useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';
import AdminStaffCabinet from './AdminStaffCabinet';

// Хук для подсчёта непросмотренных задач (обновляется каждые 60 сек)
function useTaskBadge(isAdmin: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = async () => {
      try {
        const [taskRes, reqRes] = await Promise.all([
          fetch(urls['tasks']),
          fetch(`${urls['tasks']}?type=requests`),
        ]);
        const [taskData, reqData] = await Promise.all([taskRes.json(), reqRes.json()]);
        const pending = (taskData.tasks || []).filter((t: { status: string }) => t.status === 'pending').length;
        const pendingReqs = (reqData.requests || []).filter((r: { status: string }) => r.status === 'pending').length;
        setCount(isAdmin ? pending + pendingReqs : pending);
      } catch { /* ignore */ }
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [isAdmin]);
  return count;
}

// Структура меню: блоки с разделителями
const NAV_BLOCKS = [
  {
    items: [
      { label: 'Задачи',       path: '/admin/tasks',      key: 'tasks'       },
      { label: 'Заказы',       path: '/admin/orders',     key: 'orders'      },
      { label: 'Производство', path: '/admin/production', key: 'production'  },
      { label: 'Малярка',      path: '/admin/painting',   key: 'painting'    },
      { label: 'Склад',        path: '/admin/warehouse',  key: 'warehouse'   },
    ],
  },
  {
    items: [
      { label: 'Поступления',    path: '/admin/income',   key: 'income'   },
      { label: 'База клиентов',  path: '/admin/clients',  key: 'clients'  },
      { label: 'Товары',         path: '/admin/products', key: 'products' },
    ],
  },
  {
    items: [
      { label: 'Зарплата',               path: '/admin/salary',       key: 'salary'       },
      { label: 'Сводка по сотрудникам',  path: '/admin/staff-report', key: 'staff-report' },
      { label: 'Справочник',             path: '/admin/handbook',     key: 'handbook'     },
    ],
  },
  {
    items: [
      { label: 'Права доступа', path: '/admin/access', key: 'access' },
    ],
  },
];

interface AuthData {
  is_admin: boolean;
  staff_id?: number;
  full_name?: string;
  pages: string[];
  role?: string;
}

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const taskBadge = useTaskBadge(true);

  const [authed, setAuthed] = useState<AuthData | null>(() => {
    const raw = sessionStorage.getItem('admin_auth');
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthData; } catch { return null; }
  });

  const [login,    setLogin]    = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError]     = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const doLogin = async () => {
    setAuthLoading(true); setAuthError('');
    const body: Record<string, string> = { password };
    if (login.trim()) body.login = login.trim();
    const res  = await fetch(urls['admin-auth'], {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setAuthLoading(false);
    if (data.ok) {
      const authData: AuthData = {
        is_admin:  !!data.is_admin,
        staff_id:  data.staff_id,
        full_name: data.full_name,
        pages:     data.pages || [],
      };
      sessionStorage.setItem('admin_auth', JSON.stringify(authData));
      setAuthed(authData);
    } else {
      setAuthError(data.error || 'Неверный логин или пароль');
    }
  };

  const doLogout = () => {
    sessionStorage.removeItem('admin_auth');
    setAuthed(null);
    setLogin(''); setPassword('');
  };

  // Сотрудник — есть staff_id, не admin, есть доступ к кабинету
  const isEmployee = !authed?.is_admin && !!authed?.staff_id && (authed?.pages || []).includes('cabinet');

  // Редирект сотрудника в кабинет при первом входе
  useEffect(() => {
    if (isEmployee && location.pathname === '/admin') {
      navigate('/admin/cabinet', { replace: true });
    }
  }, [isEmployee, location.pathname, navigate]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8">
            <Icon name="Wheat" className="text-accent" size={26} />
            <span className="font-display text-2xl font-semibold">FABRICA</span>
          </div>
          <h1 className="font-display text-3xl font-semibold mb-6">Вход в админку</h1>
          <input
            type="text" placeholder="Логин (оставьте пустым для admin)"
            value={login} onChange={e => setLogin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            className="w-full border border-border bg-background px-4 py-3 text-sm mb-3 outline-none focus:border-accent rounded-xl"
          />
          <input
            type="password" placeholder="Пароль"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            className="w-full border border-border bg-background px-4 py-3 text-sm mb-3 outline-none focus:border-accent rounded-xl"
          />
          {authError && <p className="text-red-500 text-sm mb-3">{authError}</p>}
          <Button onClick={doLogin} disabled={authLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-11 rounded-xl">
            {authLoading ? 'Проверяю...' : 'Войти'}
          </Button>
        </div>
      </div>
    );
  }

  const isActive = (path: string) =>
    location.pathname === path || (path === '/admin/orders' && location.pathname === '/admin');

  // Определяем видимость пункта меню
  const canSee = (key: string): boolean => {
    if (authed.is_admin) return true;
    return authed.pages.includes(key);
  };

  // Личный кабинет сотрудника — отдельный layout
  if (isEmployee) {
    return (
      <div className="min-h-screen bg-background text-foreground flex">
        <aside className="w-48 flex-shrink-0 border-r border-border min-h-screen px-3 py-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 px-2 mb-4">
            <Icon name="Wheat" className="text-accent" size={20} />
            <span className="font-display text-lg font-semibold text-primary">FABRICA</span>
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            {[
              { path: '/admin/cabinet', label: 'Мой кабинет' },
            ].map(item => (
              <button key={item.path} onClick={() => navigate(item.path)}
                className={['w-full text-center font-semibold py-2 rounded-xl border transition-colors text-sm',
                  isActive(item.path) ? 'bg-accent text-primary border-accent' : 'bg-background text-primary border-primary/40 hover:border-primary'
                ].join(' ')}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5 px-1 pt-4 border-t border-primary/15">
            {authed.full_name && <p className="text-xs text-muted-foreground truncate">{authed.full_name}</p>}
            <button onClick={doLogout} className="text-sm text-muted-foreground hover:text-accent text-left">Выйти</button>
          </div>
        </aside>
        <main className="flex-1 min-w-0 overflow-x-auto flex flex-col">
          <div className="flex-1">
            <AdminStaffCabinet auth={authed} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Левое меню */}
      <aside className="w-56 flex-shrink-0 border-r border-border min-h-screen px-4 py-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-2 mb-4">
          <Icon name="Wheat" className="text-accent" size={22} />
          <span className="font-display text-xl font-semibold text-primary">FABRICA</span>
        </div>

        <nav className="flex flex-col gap-0 flex-1">
          {NAV_BLOCKS.map((block, bi) => {
            const visibleItems = block.items.filter(item => canSee(item.key));
            if (visibleItems.length === 0) return null;
            return (
              <div key={bi}>
                {bi > 0 && <div className="border-t-2 border-primary/25 my-3" />}
                <div className="flex flex-col gap-1.5">
                  {visibleItems.map(item => {
                    const active = isActive(item.path);
                    return (
                      <div key={item.path}>
                        <button
                          onClick={() => navigate(item.path)}
                          className={[
                            'w-full text-center font-semibold py-2 rounded-xl border transition-colors text-sm relative',
                            item.key === 'tasks'
                              ? active
                                ? 'bg-[#8a9a5a] text-white border-[#8a9a5a]'
                                : 'bg-[#8a9a5a]/12 text-[#5a6a2a] border-[#8a9a5a]/40 hover:border-[#8a9a5a] hover:bg-[#8a9a5a]/20'
                              : active
                                ? 'bg-accent text-primary border-accent'
                                : 'bg-background text-primary border-primary/40 hover:border-primary',
                          ].join(' ')}
                        >
                          {item.label}
                          {item.key === 'tasks' && taskBadge > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                              {taskBadge > 99 ? '99+' : taskBadge}
                            </span>
                          )}
                        </button>
                        {/* Разделитель после «Задачи» */}
                        {item.key === 'tasks' && (
                          <div className="border-t-2 border-[#8a9a5a]/30 my-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1.5 px-1 pt-4 border-t border-primary/15">
          {authed.full_name && (
            <p className="text-xs text-muted-foreground truncate">{authed.full_name}</p>
          )}
          <a href="/" className="text-sm text-muted-foreground hover:text-accent">На сайт</a>
          <button
            onClick={doLogout}
            className="text-sm text-muted-foreground hover:text-accent text-left"
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* Контент */}
      <main className="flex-1 min-w-0 overflow-x-auto flex flex-col">
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
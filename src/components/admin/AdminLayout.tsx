import { useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';
import AdminStaffCabinet from './AdminStaffCabinet';

// Хук для подсчёта непросмотренных задач (обновляется каждые 60 сек)
// Считает только задачи, назначенные текущему пользователю (+ его заявки)
function useTaskBadge(staffId?: number) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = async () => {
      try {
        const taskUrl = staffId ? `${urls['tasks']}?staff_id=${staffId}` : urls['tasks'];
        const reqUrl  = staffId
          ? `${urls['tasks']}?type=requests&staff_id=${staffId}`
          : `${urls['tasks']}?type=requests`;
        const [taskRes, reqRes] = await Promise.all([fetch(taskUrl), fetch(reqUrl)]);
        const [taskData, reqData] = await Promise.all([taskRes.json(), reqRes.json()]);
        // Только задачи МНЕ (assigned_to) со статусом pending
        const myPending = (taskData.tasks || []).filter((t: { status: string; assigned_to: number | null }) =>
          t.status === 'pending' && (staffId ? t.assigned_to === staffId : true)
        ).length;
        // Только мои заявки pending
        const myReqPending = (reqData.requests || []).filter((r: { status: string; staff_id: number }) =>
          r.status === 'pending' && (staffId ? r.staff_id === staffId : true)
        ).length;
        setCount(myPending + myReqPending);
      } catch { /* ignore */ }
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [staffId]);
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

  const [authed, setAuthed] = useState<AuthData | null>(() => {
    const raw = sessionStorage.getItem('admin_auth');
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthData; } catch { return null; }
  });

  const taskBadge = useTaskBadge(authed?.staff_id);

  const [login,    setLogin]    = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError]     = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Закрываем мобильное меню при смене страницы
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

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
      <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
        {/* Мобильная шапка */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background z-40">
          <div className="flex items-center gap-2">
            <Icon name="Wheat" className="text-accent" size={20} />
            <span className="font-display text-lg font-semibold text-primary">FABRICA</span>
          </div>
          <button onClick={doLogout} className="text-sm text-muted-foreground hover:text-accent">Выйти</button>
        </div>
        {/* Десктоп сайдбар */}
        <aside className="hidden md:flex w-48 flex-shrink-0 border-r border-border min-h-screen px-3 py-6 flex-col gap-2">
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
        <main className="flex-1 min-w-0 overflow-x-auto flex flex-col pb-4">
          <div className="flex-1">
            <AdminStaffCabinet auth={authed} />
          </div>
        </main>
      </div>
    );
  }

  // Общий контент навигации (переиспользуется в сайдбаре и в выезжающем мобильном меню)
  const navContent = (closeAfterClick?: () => void) => (
    <>
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
              {bi > 0 && <div className="border-t-2 border-[#8B6A4A]/40 my-3" />}
              <div className="flex flex-col gap-1.5">
                {visibleItems.map(item => {
                  const active = isActive(item.path);
                  return (
                    <div key={item.path}>
                      <button
                        onClick={() => { navigate(item.path); closeAfterClick?.(); }}
                        className={[
                          'w-full text-center font-semibold py-2.5 md:py-2 rounded-xl border transition-colors text-sm relative',
                          item.key === 'tasks'
                            ? active
                              ? 'bg-[#c4849a] text-white border-[#c4849a]'
                              : 'bg-[#fce8ef] text-[#a0435a] border-[#e8a0b4]/60 hover:border-[#c4849a] hover:bg-[#f8d5e0]'
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
                        <div className="border-t-2 border-[#8B6A4A]/40 my-2" />
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
        <a href="/" className="text-sm text-muted-foreground hover:text-[#8a9a5a]">На сайт</a>
        <button
          onClick={doLogout}
          className="text-sm text-muted-foreground hover:text-[#8a9a5a] text-left"
        >
          Выйти
        </button>
      </div>
    </>
  );

  const currentLabel = NAV_BLOCKS.flatMap(b => b.items).find(i => isActive(i.path))?.label || 'FABRICA';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Мобильная шапка с бургером */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b-2 border-[#8B6A4A]/30 sticky top-0 bg-background z-40">
        <button onClick={() => setMobileMenuOpen(true)} className="p-1 -ml-1 text-primary relative">
          <Icon name="Menu" size={26} />
          {taskBadge > 0 && (
            <span className="absolute -top-0.5 right-0 w-2.5 h-2.5 rounded-full bg-red-500" />
          )}
        </button>
        <span className="font-display text-lg font-semibold text-primary truncate">{currentLabel}</span>
        <div className="w-8" />
      </div>

      {/* Мобильное выезжающее меню */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-background border-r-2 border-[#8B6A4A]/30 h-full px-4 py-6 flex flex-col gap-2 overflow-y-auto">
            <button onClick={() => setMobileMenuOpen(false)} className="absolute top-4 right-3 text-primary/60">
              <Icon name="X" size={22} />
            </button>
            {navContent(() => setMobileMenuOpen(false))}
          </div>
        </div>
      )}

      {/* Левое меню — только десктоп */}
      <aside className="hidden md:flex w-56 flex-shrink-0 border-r-2 border-[#8B6A4A]/30 min-h-screen px-4 py-6 flex-col gap-2">
        {navContent()}
      </aside>

      {/* Контент */}
      <main className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
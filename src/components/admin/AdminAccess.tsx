import { useState, useEffect } from 'react';
import urls from '../../../backend/func2url.json';

// Все страницы с метками
const ALL_PAGES = [
  { key: 'orders',      label: 'Заказы' },
  { key: 'calendar',    label: 'Календарь' },
  { key: 'production',  label: 'Производство' },
  { key: 'painting',    label: 'Малярка' },
  { key: 'warehouse',   label: 'Склад' },
  { key: 'income',      label: 'Поступления' },
  { key: 'clients',     label: 'База клиентов' },
  { key: 'products',    label: 'Товары' },
  { key: 'salary',      label: 'Зарплата' },
  { key: 'staff-report',label: 'Сводка по сотрудникам' },
  { key: 'handbook',    label: 'Справочник' },
  { key: 'access',      label: 'Права доступа' },
];

const GROUPS = ['Администрация', 'Руководители отделов', 'Сотрудники'];

interface StaffMember {
  id: number;
  full_name: string;
  login: string;
  role: string;
  group_name: string;
  pages: string[];
  is_active: boolean;
}

const EMPTY_FORM = { full_name: '', login: '', password: '', role: 'employee', group_name: 'Сотрудники', pages: [] as string[] };

const AdminAccess = () => {
  const [staff, setStaff]     = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId]   = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    const res  = await fetch(urls['staff']);
    const data = await res.json();
    setStaff(data.staff || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePage = (key: string) => {
    setForm(f => ({
      ...f,
      pages: f.pages.includes(key) ? f.pages.filter(p => p !== key) : [...f.pages, key],
    }));
  };

  const startAdd = (group: string) => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, group_name: group });
    setShowForm(true);
  };

  const startEdit = (s: StaffMember) => {
    setEditId(s.id);
    setForm({ full_name: s.full_name, login: s.login, password: '', role: s.role, group_name: s.group_name, pages: [...s.pages] });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.full_name.trim() || !form.login.trim()) return;
    if (!editId && !form.password.trim()) return;
    setSaving(true);
    if (editId) {
      const body: Record<string, unknown> = { id: editId, full_name: form.full_name, login: form.login, role: form.role, group_name: form.group_name, pages: form.pages };
      if (form.password) body.password = form.password;
      await fetch(urls['staff'], { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch(urls['staff'], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form }) });
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    await load();
  };

  const deactivate = async (id: number) => {
    await fetch(urls['staff'], { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: false }) });
    setStaff(prev => prev.filter(s => s.id !== id));
  };

  const restore = async (id: number) => {
    await fetch(urls['staff'], { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: true }) });
    await load();
  };

  const groupStaff = (group: string) => staff.filter(s => s.group_name === group);

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="font-display text-2xl font-semibold text-primary mb-6">Права доступа</h1>

      {loading ? (
        <p className="text-muted-foreground">Загружаю...</p>
      ) : (
        <div className="space-y-8">
          {GROUPS.map(group => (
            <div key={group}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-primary text-lg">{group}</h2>
                <button
                  onClick={() => startAdd(group)}
                  className="text-sm px-3 py-1 rounded-xl border border-primary/40 text-primary hover:border-primary transition-colors"
                >
                  + Добавить
                </button>
              </div>

              {groupStaff(group).length === 0 ? (
                <p className="text-sm text-muted-foreground pl-1">Нет сотрудников</p>
              ) : (
                <div className="space-y-3">
                  {groupStaff(group).map(s => (
                    <div key={s.id} className={`border rounded-2xl p-4 ${s.is_active ? 'border-primary/30 bg-card' : 'border-border bg-muted/30 opacity-60'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-primary">{s.full_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Логин: {s.login}</div>
                          {/* Страницы */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {s.pages.length === 0
                              ? <span className="text-xs text-muted-foreground italic">Нет доступа</span>
                              : s.pages.map(p => {
                                const pg = ALL_PAGES.find(x => x.key === p);
                                return (
                                  <span key={p} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20">
                                    {pg?.label || p}
                                  </span>
                                );
                              })
                            }
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => startEdit(s)} className="text-xs text-primary/70 hover:text-primary underline">Изменить</button>
                          {s.is_active
                            ? <button onClick={() => deactivate(s.id)} className="text-xs text-red-400 hover:text-red-600 underline">Деактив.</button>
                            : <button onClick={() => restore(s.id)} className="text-xs text-primary/70 hover:text-primary underline">Восстановить</button>
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Форма добавления / редактирования */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-primary text-lg mb-4">{editId ? 'Редактировать сотрудника' : 'Новый сотрудник'}</h2>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Имя и фамилия *</label>
                <input
                  value={form.full_name}
                  onChange={e => setForm(f => ({...f, full_name: e.target.value}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm bg-background outline-none focus:border-accent"
                  placeholder="Иванова Мария"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Логин *</label>
                <input
                  value={form.login}
                  onChange={e => setForm(f => ({...f, login: e.target.value}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm bg-background outline-none focus:border-accent"
                  placeholder="ivanova"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{editId ? 'Новый пароль (оставьте пустым чтобы не менять)' : 'Пароль *'}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm bg-background outline-none focus:border-accent"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Группа</label>
                <select
                  value={form.group_name}
                  onChange={e => setForm(f => ({...f, group_name: e.target.value}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm bg-background outline-none focus:border-accent"
                >
                  {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Доступ к страницам */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider block mb-2">Доступные страницы</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PAGES.map(pg => (
                  <label key={pg.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-primary/5">
                    <input
                      type="checkbox"
                      checked={form.pages.includes(pg.key)}
                      onChange={() => togglePage(pg.key)}
                      className="accent-accent"
                    />
                    <span className="text-sm text-primary">{pg.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={save} disabled={saving}
                className="flex-1 bg-accent hover:bg-accent/90 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
              >
                {saving ? 'Сохраняю...' : editId ? 'Сохранить' : 'Создать'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary hover:border-primary text-sm transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccess;

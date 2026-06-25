import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import urls from '../../backend/func2url.json';

const SHAPES = ['Круглые', 'Овальные', 'Прямоугольные', 'Сердечки'];
const SIZES = ['Малые', 'Средние', 'Большие'];

interface Product {
  id?: number;
  name: string;
  description: string;
  shape: string;
  size: string;
  color: string;
  price: number;
  image_url: string;
}

const empty = (): Product => ({ name: '', description: '', shape: 'Круглые', size: 'Средние', color: '', price: 0, image_url: '' });

const Admin = () => {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_ok') === '1');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState<'append' | 'replace'>('append');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [imgUploading, setImgUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const login = async () => {
    setAuthLoading(true);
    setAuthError('');
    const res = await fetch(urls['admin-auth'], { method: 'POST', body: JSON.stringify({ password }) });
    const data = await res.json();
    setAuthLoading(false);
    if (data.ok) { sessionStorage.setItem('admin_ok', '1'); setAuthed(true); }
    else setAuthError('Неверный пароль');
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch(urls['products']);
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  };

  useEffect(() => { if (authed) load(); }, [authed]);

  const save = async () => {
    setSaving(true);
    const method = editing?.id ? 'PUT' : 'POST';
    await fetch(urls['products'], { method, body: JSON.stringify(editing) });
    setSaving(false);
    setEditing(null);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить товар?')) return;
    setDeleting(id);
    await fetch(`${urls['products']}?id=${id}`, { method: 'DELETE' });
    setDeleting(null);
    load();
  };

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg('');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ev.target?.result as ArrayBuffer)));
      const res = await fetch(urls['upload-excel'], { method: 'POST', body: JSON.stringify({ file: b64, mode: uploadMode }) });
      const data = await res.json();
      setImporting(false);
      setImportMsg(data.imported ? `Загружено товаров: ${data.imported}` : data.error || 'Ошибка');
      load();
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setImgUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ev.target?.result as ArrayBuffer)));
      const res = await fetch(urls['upload-image'], { method: 'POST', body: JSON.stringify({ file: b64, ext }) });
      const data = await res.json();
      setImgUploading(false);
      if (data.url) setEditing(prev => prev ? { ...prev, image_url: data.url } : prev);
    };
    reader.readAsArrayBuffer(file);
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
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            className="w-full border border-border bg-background px-4 py-3 text-sm mb-3 outline-none focus:border-accent"
          />
          {authError && <p className="text-red-500 text-sm mb-3">{authError}</p>}
          <Button onClick={login} disabled={authLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-11">
            {authLoading ? 'Проверяю...' : 'Войти'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="Wheat" className="text-accent" size={22} />
          <span className="font-display text-xl font-semibold">FABRICA — Админка</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm text-muted-foreground hover:text-accent">На сайт</a>
          <Button size="sm" variant="outline" className="rounded-none" onClick={() => { sessionStorage.removeItem('admin_ok'); setAuthed(false); }}>
            Выйти
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        {/* Excel import */}
        <div className="bg-card border border-border p-6 mb-8">
          <h2 className="font-display text-xl font-semibold mb-4">Загрузка из Excel</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Колонки файла: <code className="bg-secondary px-1">name, description, shape, size, color, price, image_url</code>
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={uploadMode === 'append'} onChange={() => setUploadMode('append')} />
              Добавить к существующим
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={uploadMode === 'replace'} onChange={() => setUploadMode('replace')} />
              Заменить все товары
            </label>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={() => fileRef.current?.click()} disabled={importing} className="rounded-none bg-accent hover:bg-accent/90 text-accent-foreground">
              <Icon name="Upload" size={16} className="mr-2" />
              {importing ? 'Загружаю...' : 'Выбрать файл .xlsx'}
            </Button>
            {importMsg && <span className="text-sm text-muted-foreground">{importMsg}</span>}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleExcel} />
        </div>

        {/* Table */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Товары ({products.length})</h2>
          <Button onClick={() => setEditing(empty())} className="rounded-none bg-accent hover:bg-accent/90 text-accent-foreground">
            <Icon name="Plus" size={16} className="mr-2" /> Добавить товар
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Загружаю...</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground">Товаров пока нет. Загрузите Excel или добавьте вручную.</p>
        ) : (
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Фото</th>
                  <th className="text-left px-4 py-3 font-medium">Название</th>
                  <th className="text-left px-4 py-3 font-medium">Форма</th>
                  <th className="text-left px-4 py-3 font-medium">Размер</th>
                  <th className="text-left px-4 py-3 font-medium">Цвет</th>
                  <th className="text-left px-4 py-3 font-medium">Цена</th>
                  <th className="text-left px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-12 h-12 object-cover" />
                        : <div className="w-12 h-12 bg-secondary flex items-center justify-center"><Icon name="Image" size={18} className="opacity-30" /></div>
                      }
                    </td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.shape}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.size}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.color || '—'}</td>
                    <td className="px-4 py-3">{p.price} ₽</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="rounded-none h-8" onClick={() => setEditing({ ...p })}>
                          <Icon name="Pencil" size={14} />
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-none h-8 text-red-500 hover:text-red-600" onClick={() => remove(p.id!)} disabled={deleting === p.id}>
                          <Icon name="Trash2" size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="bg-background border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-2xl font-semibold">{editing.id ? 'Редактировать' : 'Новый товар'}</h3>
              <button onClick={() => setEditing(null)}><Icon name="X" size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Название</label>
                <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Описание</label>
                <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })}
                  rows={2} className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Форма</label>
                  <select value={editing.shape} onChange={e => setEditing({ ...editing, shape: e.target.value })}
                    className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
                    {SHAPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Размер</label>
                  <select value={editing.size} onChange={e => setEditing({ ...editing, size: e.target.value })}
                    className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
                    {SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Цвет</label>
                  <input value={editing.color} onChange={e => setEditing({ ...editing, color: e.target.value })}
                    placeholder="напр. Натуральный"
                    className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Цена (₽)</label>
                  <input type="number" value={editing.price} onChange={e => setEditing({ ...editing, price: +e.target.value })}
                    className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Фото</label>
                <div className="flex gap-3 items-start">
                  {editing.image_url && <img src={editing.image_url} className="w-16 h-16 object-cover border border-border" />}
                  <div className="flex-1">
                    <input value={editing.image_url} onChange={e => setEditing({ ...editing, image_url: e.target.value })}
                      placeholder="URL фото или загрузите файл"
                      className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent mb-2" />
                    <Button size="sm" variant="outline" className="rounded-none" onClick={() => imgRef.current?.click()} disabled={imgUploading}>
                      <Icon name="Upload" size={14} className="mr-1" />
                      {imgUploading ? 'Загружаю...' : 'Загрузить фото'}
                    </Button>
                    <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={save} disabled={saving || !editing.name} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-none">
                {saving ? 'Сохраняю...' : 'Сохранить'}
              </Button>
              <Button variant="outline" className="rounded-none" onClick={() => setEditing(null)}>Отмена</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

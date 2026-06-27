import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';

const SHAPES = ['Круглые', 'Овальные', 'Прямоугольные', 'Сердечки'];
const SIZES = ['Малые', 'Средние', 'Большие'];
const WEAVE_TYPES = ['На колотой', 'На шпоне'];
const HANDLES_OPTIONS = ['1 ручка', '2 ручки'];
const LABEL_OPTIONS = [
  { value: 'новинка',    label: 'Новинка' },
  { value: 'акция',      label: 'Акция' },
  { value: 'топ продаж', label: 'Топ продаж' },
];

const ALL_COLUMNS = [
  { key: 'photo',         label: 'Фото' },
  { key: 'sku',           label: 'Артикул' },
  { key: 'name',          label: 'Название' },
  { key: 'shape',         label: 'Форма' },
  { key: 'size',          label: 'Размер' },
  { key: 'color',         label: 'Цвет' },
  { key: 'price',         label: 'Цена' },
  { key: 'sale_price',    label: 'По акции' },
  { key: 'labels',        label: 'Метки' },
  { key: 'priority',      label: 'Приоритет' },
  { key: 'weave_type',    label: 'Плетение' },
  { key: 'handles_count', label: 'Ручки' },
  { key: 'group_id',      label: 'Группа' },
];
const DEFAULT_VISIBLE = ['photo', 'sku', 'name', 'shape', 'size', 'color', 'price', 'sale_price', 'labels', 'priority'];

interface Product {
  id?: number;
  sku: string;
  name: string;
  description: string;
  shape: string;
  size: string;
  color: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  images: string[];
  video_url: string;
  group_id: string;
  group_by: string;
  split_by: string;
  labels: string;
  priority: number | null;
  weave_type: string;
  handles_count: string;
}

const empty = (): Product => ({
  sku: '', name: '', description: '', shape: 'Круглые', size: 'Средние',
  color: '', price: 0, sale_price: null, image_url: '', images: [], video_url: '',
  group_id: '', group_by: '', split_by: '',
  labels: '', priority: null, weave_type: '', handles_count: '',
});

function parseLabels(s: string): string[] {
  return s ? s.split(';').map(l => l.trim()).filter(Boolean) : [];
}
function labelsToStr(arr: string[]): string { return arr.join(';'); }

const inputCls = "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
const labelCls = "text-xs uppercase tracking-wider text-muted-foreground mb-1 block";

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState<'append' | 'replace'>('append');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [imgUploading, setImgUploading] = useState(false);
  const [visibleCols, setVisibleCols] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('admin_cols') || 'null') || DEFAULT_VISIBLE; }
    catch { return DEFAULT_VISIBLE; }
  });
  const [colsOpen, setColsOpen] = useState(false);

  const fileRef   = useRef<HTMLInputElement>(null);
  const imgRef    = useRef<HTMLInputElement>(null);
  const extraImgRef = useRef<HTMLInputElement>(null);

  const toggleCol = (key: string) => {
    const next = visibleCols.includes(key)
      ? visibleCols.filter(k => k !== key)
      : [...visibleCols, key];
    setVisibleCols(next);
    localStorage.setItem('admin_cols', JSON.stringify(next));
  };
  const col = (key: string) => visibleCols.includes(key);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${urls['products']}?raw=1`);
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const method = editing?.id ? 'PUT' : 'POST';
    await fetch(urls['products'], { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
    setSaving(false); setEditing(null); load();
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить товар?')) return;
    setDeleting(id);
    await fetch(`${urls['products']}?id=${id}`, { method: 'DELETE' });
    setDeleting(null); load();
  };

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg('');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ev.target?.result as ArrayBuffer)));
      const res = await fetch(urls['upload-excel'], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: b64, mode: uploadMode }) });
      const data = await res.json();
      setImporting(false);
      setImportMsg(data.imported ? `Загружено/обновлено: ${data.imported}` : data.error || 'Ошибка');
      load();
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleExport = async () => {
    setExporting(true);
    const res = await fetch(urls['export-excel']);
    const data = await res.json();
    setExporting(false);
    if (!data.file) return;
    const bytes = Uint8Array.from(atob(data.file), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'products.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() || 'jpg';
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const b64 = btoa(String.fromCharCode(...new Uint8Array(ev.target?.result as ArrayBuffer)));
        const res = await fetch(urls['upload-image'], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: b64, ext }) });
        const data = await res.json();
        resolve(data.url || null);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setImgUploading(true);
    const url = await uploadImage(file);
    setImgUploading(false);
    if (url) setEditing(prev => prev ? {
      ...prev,
      image_url: url,
      images: [url, ...(prev.images || []).filter(u => u !== prev.image_url)],
    } : prev);
    e.target.value = '';
  };

  const handleExtraImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !editing) return;
    setImgUploading(true);
    const urls_arr: string[] = [];
    for (const file of files) {
      const url = await uploadImage(file);
      if (url) urls_arr.push(url);
    }
    setImgUploading(false);
    setEditing(prev => prev ? { ...prev, images: [...(prev.images || []), ...urls_arr] } : prev);
    e.target.value = '';
  };

  const toggleLabel = (val: string) => {
    if (!editing) return;
    const current = parseLabels(editing.labels);
    const next = current.includes(val) ? current.filter(l => l !== val) : [...current, val];
    setEditing({ ...editing, labels: labelsToStr(next) });
  };

  const editingLabels = editing ? parseLabels(editing.labels) : [];
  const filteredProducts = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="text-foreground">
      <main className="px-6 py-8">
        {/* Excel блок */}
        <div className="bg-card border border-border p-6 mb-8 rounded-2xl">
          <h2 className="font-display text-xl font-semibold mb-4">Excel</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Колонки: <code className="bg-secondary px-1">артикул, название, описание, форма, размер, цвет, цена, цена по акции, фото, группа, группировать по, разделить по, метки, приоритет, вид плетения, кол-во ручек</code>
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Если артикул совпадает с существующим — товар обновится. Новый артикул — создаётся новая позиция.
          </p>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={uploadMode === 'append'} onChange={() => setUploadMode('append')} />
              Добавить / обновить по артикулу
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={uploadMode === 'replace'} onChange={() => setUploadMode('replace')} />
              Заменить все товары
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => fileRef.current?.click()} disabled={importing} className="rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground">
              <Icon name="Upload" size={16} className="mr-2" />
              {importing ? 'Загружаю...' : 'Загрузить .xlsx'}
            </Button>
            <Button onClick={handleExport} disabled={exporting} variant="outline" className="rounded-xl">
              <Icon name="Download" size={16} className="mr-2" />
              {exporting ? 'Готовлю...' : 'Выгрузить .xlsx'}
            </Button>
            {importMsg && <span className="text-sm text-muted-foreground">{importMsg}</span>}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleExcel} />
        </div>

        {/* Шапка таблицы */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-xl font-semibold">Товары ({products.length})</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию / артикулу..."
                className="w-full border border-border bg-background pl-8 pr-8 py-2 text-sm outline-none focus:border-accent rounded-lg" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent">
                  <Icon name="X" size={13} />
                </button>
              )}
            </div>
            <div className="relative">
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setColsOpen(v => !v)}>
                <Icon name="SlidersHorizontal" size={14} className="mr-1.5" /> Колонки
              </Button>
              {colsOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 bg-background border border-border shadow-lg p-3 w-52 rounded-xl">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Показывать колонки</p>
                  <div className="space-y-1.5">
                    {ALL_COLUMNS.map(c => (
                      <label key={c.key} className="flex items-center gap-2 cursor-pointer">
                        <span className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-colors ${visibleCols.includes(c.key) ? 'bg-accent border-accent' : 'border-border hover:border-accent'}`}>
                          {visibleCols.includes(c.key) && <Icon name="Check" size={11} className="text-accent-foreground" />}
                        </span>
                        <input type="checkbox" className="hidden" checked={visibleCols.includes(c.key)} onChange={() => toggleCol(c.key)} />
                        <span className="text-sm">{c.label}</span>
                      </label>
                    ))}
                  </div>
                  <button onClick={() => { setVisibleCols(DEFAULT_VISIBLE); localStorage.setItem('admin_cols', JSON.stringify(DEFAULT_VISIBLE)); }}
                    className="text-xs text-muted-foreground hover:text-accent mt-3">Сбросить</button>
                </div>
              )}
            </div>
            <Button onClick={() => setEditing(empty())} className="rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground whitespace-nowrap">
              <Icon name="Plus" size={16} className="mr-2" /> Добавить
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Загружаю...</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground">Товаров пока нет. Загрузите Excel или добавьте вручную.</p>
        ) : (
          <div className="border border-border overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 border-b border-border">
                <tr>
                  {col('photo')         && <th className="text-left px-4 py-3 font-medium">Фото</th>}
                  {col('sku')           && <th className="text-left px-4 py-3 font-medium">Артикул</th>}
                  {col('name')          && <th className="text-left px-4 py-3 font-medium">Название</th>}
                  {col('shape')         && <th className="text-left px-4 py-3 font-medium">Форма</th>}
                  {col('size')          && <th className="text-left px-4 py-3 font-medium">Размер</th>}
                  {col('color')         && <th className="text-left px-4 py-3 font-medium">Цвет</th>}
                  {col('price')         && <th className="text-left px-4 py-3 font-medium">Цена</th>}
                  {col('sale_price')    && <th className="text-left px-4 py-3 font-medium">По акции</th>}
                  {col('labels')        && <th className="text-left px-4 py-3 font-medium">Метки</th>}
                  {col('priority')      && <th className="text-left px-4 py-3 font-medium">Приор.</th>}
                  {col('weave_type')    && <th className="text-left px-4 py-3 font-medium">Плетение</th>}
                  {col('handles_count') && <th className="text-left px-4 py-3 font-medium">Ручки</th>}
                  {col('group_id')      && <th className="text-left px-4 py-3 font-medium">Группа</th>}
                  <th className="text-left px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                    {col('photo') && (
                      <td className="px-4 py-3">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} className="w-12 h-12 object-cover rounded-md" />
                          : <div className="w-12 h-12 bg-secondary flex items-center justify-center rounded-md"><Icon name="Image" size={18} className="opacity-30" /></div>}
                      </td>
                    )}
                    {col('sku')           && <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.sku || '—'}</td>}
                    {col('name')          && <td className="px-4 py-3 font-medium">{p.name}</td>}
                    {col('shape')         && <td className="px-4 py-3 text-muted-foreground">{p.shape}</td>}
                    {col('size')          && <td className="px-4 py-3 text-muted-foreground">{p.size}</td>}
                    {col('color')         && <td className="px-4 py-3 text-muted-foreground">{p.color || '—'}</td>}
                    {col('price')         && <td className="px-4 py-3">{p.price} ₽</td>}
                    {col('sale_price')    && <td className="px-4 py-3">{p.sale_price ? <span className="text-accent">{p.sale_price} ₽</span> : '—'}</td>}
                    {col('labels')        && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {parseLabels(p.labels).map(l => (
                            <span key={l} className="text-[10px] bg-accent/10 text-accent border border-accent/30 px-1.5 py-0.5 uppercase tracking-wide rounded">{l}</span>
                          ))}
                          {!p.labels && <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>
                    )}
                    {col('priority')      && <td className="px-4 py-3 text-muted-foreground">{p.priority ?? '—'}</td>}
                    {col('weave_type')    && <td className="px-4 py-3 text-muted-foreground">{p.weave_type || '—'}</td>}
                    {col('handles_count') && <td className="px-4 py-3 text-muted-foreground">{p.handles_count || '—'}</td>}
                    {col('group_id')      && <td className="px-4 py-3 text-muted-foreground text-xs">{p.group_id || '—'}</td>}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="rounded-lg h-8" onClick={() => setEditing({
                          ...p, sku: p.sku || '', group_id: p.group_id || '', group_by: p.group_by || '',
                          split_by: p.split_by || '', labels: p.labels || '',
                          weave_type: p.weave_type || '', handles_count: p.handles_count || '',
                          images: p.images || [], video_url: p.video_url || '',
                        })}>
                          <Icon name="Pencil" size={14} />
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-lg h-8 text-red-500 hover:text-red-600" onClick={() => remove(p.id!)} disabled={deleting === p.id}>
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

      {colsOpen && <div className="fixed inset-0 z-20" onClick={() => setColsOpen(false)} />}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="bg-background border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-2xl font-semibold">{editing.id ? 'Редактировать' : 'Новый товар'}</h3>
              <button onClick={() => setEditing(null)}><Icon name="X" size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Артикул <span className="normal-case text-muted-foreground/60">(уникальный, обязательный)</span></label>
                <input value={editing.sku} onChange={e => setEditing({ ...editing, sku: e.target.value })}
                  placeholder="напр. KRG-001" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Название</label>
                <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Описание</label>
                <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })}
                  rows={2} className={inputCls + ' resize-none'} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Форма</label>
                  <select value={editing.shape} onChange={e => setEditing({ ...editing, shape: e.target.value })} className={inputCls}>
                    {SHAPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Размер</label>
                  <select value={editing.size} onChange={e => setEditing({ ...editing, size: e.target.value })} className={inputCls}>
                    {SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Цвет</label>
                  <input value={editing.color} onChange={e => setEditing({ ...editing, color: e.target.value })}
                    placeholder="напр. Натуральный" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Цена (₽)</label>
                  <input type="number" value={editing.price} onChange={e => setEditing({ ...editing, price: +e.target.value })} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Цена по акции (₽) — необязательно</label>
                <input type="number" value={editing.sale_price ?? ''} onChange={e => setEditing({ ...editing, sale_price: e.target.value ? +e.target.value : null })}
                  placeholder="Оставьте пустым если акции нет" className={inputCls} />
              </div>

              <div className="border-t border-border pt-4">
                <label className={labelCls}>Метки (можно выбрать несколько)</label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {LABEL_OPTIONS.map(opt => {
                    const checked = editingLabels.includes(opt.value);
                    return (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <span className={`w-4 h-4 border flex items-center justify-center transition-colors flex-shrink-0 ${checked ? 'bg-accent border-accent' : 'border-border hover:border-accent'}`}>
                          {checked && <Icon name="Check" size={11} className="text-accent-foreground" />}
                        </span>
                        <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleLabel(opt.value)} />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>Приоритет в каталоге</label>
                <input type="number" value={editing.priority ?? ''} onChange={e => setEditing({ ...editing, priority: e.target.value ? +e.target.value : null })}
                  placeholder="1 — первое место, 2 — второе (пусто — в конце)" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Вид плетения</label>
                  <select value={editing.weave_type} onChange={e => setEditing({ ...editing, weave_type: e.target.value })} className={inputCls}>
                    <option value="">— не указано —</option>
                    {WEAVE_TYPES.map(w => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Кол-во ручек</label>
                  <select value={editing.handles_count} onChange={e => setEditing({ ...editing, handles_count: e.target.value })} className={inputCls}>
                    <option value="">— не указано —</option>
                    {HANDLES_OPTIONS.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Группировка вариантов</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Номер группы — одинаковый для всех вариантов одной модели</label>
                    <input value={editing.group_id} onChange={e => setEditing({ ...editing, group_id: e.target.value })} placeholder="напр. italia" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Группировать по — характеристики, по которым есть варианты (через ;)</label>
                    <input value={editing.group_by} onChange={e => setEditing({ ...editing, group_by: e.target.value })} placeholder="напр. Цвет; Размер" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Разделить на карточки по — что создаёт отдельные карточки (через ;)</label>
                    <input value={editing.split_by} onChange={e => setEditing({ ...editing, split_by: e.target.value })} placeholder="напр. Размер" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* ФОТО — несколько */}
              <div className="border-t border-border pt-4">
                <label className={labelCls}>Фото (можно несколько)</label>

                {/* Галерея всех фото */}
                {(editing.images || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(editing.images || []).map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img src={url} className={`w-16 h-16 object-cover rounded-md border-2 cursor-pointer ${idx === 0 ? 'border-accent' : 'border-border'}`}
                          title={idx === 0 ? 'Главное фото' : 'Нажмите чтобы сделать главным'}
                          onClick={() => setEditing(prev => prev ? { ...prev, image_url: url, images: [url, ...(prev.images||[]).filter((_,i)=>i!==idx)] } : prev)}
                        />
                        {idx === 0 && <span className="absolute -top-1 -left-1 bg-accent text-white text-[8px] px-1 rounded font-bold">ГЛАВНОЕ</span>}
                        <button
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] hidden group-hover:flex items-center justify-center"
                          onClick={() => setEditing(prev => {
                            if (!prev) return prev;
                            const imgs = (prev.images||[]).filter((_,i)=>i!==idx);
                            return { ...prev, images: imgs, image_url: imgs[0] || '' };
                          })}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Основное фото — URL или загрузка */}
                <div className="flex gap-2 mb-2 items-center">
                  <input value={editing.image_url} onChange={e => {
                    const url = e.target.value;
                    setEditing(prev => prev ? {
                      ...prev, image_url: url,
                      images: url ? [url, ...(prev.images||[]).slice(1)] : (prev.images||[]).slice(1),
                    } : prev);
                  }} placeholder="URL главного фото" className={inputCls + ' flex-1'} />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => imgRef.current?.click()} disabled={imgUploading}>
                    <Icon name="Upload" size={14} className="mr-1" />
                    {imgUploading ? 'Загружаю...' : 'Главное фото'}
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => extraImgRef.current?.click()} disabled={imgUploading}>
                    <Icon name="Plus" size={14} className="mr-1" />
                    Ещё фото
                  </Button>
                </div>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
                <input ref={extraImgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleExtraImg} />
                <p className="text-xs text-muted-foreground mt-1">Нажмите на фото чтобы сделать его главным. Первое фото показывается в каталоге.</p>
              </div>

              {/* ВИДЕО */}
              <div>
                <label className={labelCls}>Видео (URL YouTube или прямая ссылка)</label>
                <input value={editing.video_url || ''} onChange={e => setEditing({ ...editing, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... или прямая ссылка на mp4"
                  className={inputCls} />
                {editing.video_url && (
                  <div className="mt-2">
                    {editing.video_url.includes('youtube') || editing.video_url.includes('youtu.be') ? (
                      <a href={editing.video_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                        Открыть видео на YouTube ↗
                      </a>
                    ) : (
                      <video src={editing.video_url} controls className="w-full max-h-32 rounded-md border border-border" />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={save} disabled={saving || !editing.name} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg">
                {saving ? 'Сохраняю...' : 'Сохранить'}
              </Button>
              <Button variant="outline" className="rounded-lg" onClick={() => setEditing(null)}>Отмена</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
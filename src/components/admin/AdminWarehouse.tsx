import { useState, useEffect } from 'react';
import urls from '../../../backend/func2url.json';

interface WarehouseItem {
  id: number;
  catalog_name: string;
  qty_full: number;
  qty_no_handle: number;
  updated_at: string;
}

interface LogEntry {
  id: number;
  catalog_name: string;
  operation: string;
  qty_full: number;
  qty_no_handle: number;
  comment: string;
  created_by: string;
  created_at: string;
}

// Имена каталога из products
interface CatalogProduct {
  id: number;
  name: string;
  size?: string;
}

const OP_LABELS: Record<string, string> = {
  income_staff: 'Приход от сотрудников',
  add:          'Ручное добавление',
  defect:       'Брак',
};

const OP_COLORS: Record<string, string> = {
  income_staff: 'text-[#6b7c3a]',
  add:          'text-blue-600',
  defect:       'text-red-500',
};

function fmtDt(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

type WhSortCol = 'catalog_name' | 'qty_full' | 'qty_no_handle' | 'total' | 'updated_at';

const AdminWarehouse = () => {
  const [items, setItems]         = useState<WarehouseItem[]>([]);
  const [allNames, setAllNames]   = useState<string[]>([]); // все имена из products
  const [log, setLog]             = useState<LogEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showOnlyStock, setShowOnlyStock] = useState(false);
  const [showLog, setShowLog]     = useState(false);
  const [logItem, setLogItem]     = useState<string | null>(null);
  const [sortCol, setSortCol]     = useState<WhSortCol>('catalog_name');
  const [sortAsc, setSortAsc]     = useState(true);

  // Форма операции
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    catalog_name: '', operation: 'add' as 'add' | 'defect',
    qty_full: 0, qty_no_handle: 0, comment: '',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const [whRes, prodRes] = await Promise.all([
        fetch(`${urls['reports']}?type=warehouse`),
        fetch(`${urls['products']}?raw=1`),
      ]);
      const [whData, prodData] = await Promise.all([whRes.json(), prodRes.json()]);
      const warehouseItems: WarehouseItem[] = whData.items || [];
      setItems(warehouseItems);

      // Собираем все уникальные имена из каталога
      const products: CatalogProduct[] = prodData.products || [];
      const existingNames = new Set(warehouseItems.map(i => i.catalog_name));
      const catalogNames = Array.from(new Set(
        products.map((p: CatalogProduct) => p.size ? `${p.name} (${p.size})` : p.name)
      )).sort();

      // Добавляем позиции из каталога которых нет на складе — с qty=0
      const missing: WarehouseItem[] = catalogNames
        .filter(n => !existingNames.has(n))
        .map((n, i) => ({ id: -(i + 1), catalog_name: n, qty_full: 0, qty_no_handle: 0, updated_at: '' }));

      setItems([...warehouseItems, ...missing].sort((a, b) => a.catalog_name.localeCompare(b.catalog_name, 'ru')));
      setAllNames(catalogNames);
    } catch { /* fallback */ }
    setLoading(false);
  };

  const loadLog = async (catalogName?: string) => {
    try {
      const url = catalogName
        ? `${urls['reports']}?type=warehouse_log&catalog_name=${encodeURIComponent(catalogName)}`
        : `${urls['reports']}?type=warehouse_log`;
      const res  = await fetch(url);
      const data = await res.json();
      setLog(data.log || []);
    } catch { /* fallback */ }
  };

  useEffect(() => { loadItems(); }, []);

  const openLog = async (catalogName?: string) => {
    setLogItem(catalogName || null);
    await loadLog(catalogName);
    setShowLog(true);
  };

  const doOperation = async () => {
    if (!form.catalog_name.trim()) return;
    setSaving(true);
    try {
      await fetch(urls['reports'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'warehouse_manual', ...form }),
      });
      setShowForm(false);
      await loadItems();
    } catch { /* ignore */ }
    setSaving(false);
  };

  // Фильтрация + сортировка
  const filtered = items
    .filter(i => {
      const matchSearch = i.catalog_name.toLowerCase().includes(search.toLowerCase());
      const matchStock  = !showOnlyStock || (i.qty_full + i.qty_no_handle) > 0;
      return matchSearch && matchStock;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'catalog_name') cmp = a.catalog_name.localeCompare(b.catalog_name, 'ru');
      else if (sortCol === 'qty_full') cmp = a.qty_full - b.qty_full;
      else if (sortCol === 'qty_no_handle') cmp = a.qty_no_handle - b.qty_no_handle;
      else if (sortCol === 'total') cmp = (a.qty_full + a.qty_no_handle) - (b.qty_full + b.qty_no_handle);
      else if (sortCol === 'updated_at') cmp = (a.updated_at || '').localeCompare(b.updated_at || '');
      return sortAsc ? cmp : -cmp;
    });

  const whTh = (col: WhSortCol, label: string, align = 'left') => (
    <th className={`px-4 py-3 text-${align} font-semibold cursor-pointer hover:text-primary select-none`}
      onClick={() => { if (sortCol === col) setSortAsc(v => !v); else { setSortCol(col); setSortAsc(col !== 'qty_full' && col !== 'qty_no_handle' && col !== 'total'); } }}>
      {label}{sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : <span className="opacity-30"> ↕</span>}
    </th>
  );

  const totalFull     = items.filter(i => i.id > 0).reduce((s, i) => s + i.qty_full, 0);
  const totalNoHandle = items.filter(i => i.id > 0).reduce((s, i) => s + i.qty_no_handle, 0);
  const posWithStock  = items.filter(i => (i.qty_full + i.qty_no_handle) > 0).length;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="font-display text-2xl font-semibold text-primary mb-1">Склад</h1>

      {/* Сводка */}
      <div className="flex gap-4 mb-5 flex-wrap">
        <div className="bg-card border border-primary/30 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Готовых корзин</div>
          <div className="text-2xl font-bold text-primary">{totalFull}</div>
        </div>
        <div className="bg-card border border-primary/30 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Без ручек</div>
          <div className="text-2xl font-bold text-primary">{totalNoHandle}</div>
        </div>
        <div className="bg-card border border-primary/30 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Позиций в наличии</div>
          <div className="text-2xl font-bold text-primary">{posWithStock}</div>
        </div>
      </div>

      {/* Тулбар */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию..."
          className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent flex-1 min-w-[200px]" />

        {/* Фильтр */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowOnlyStock(false)}
            className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${!showOnlyStock ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'}`}
          >
            Все позиции
          </button>
          <button
            onClick={() => setShowOnlyStock(true)}
            className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showOnlyStock ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'}`}
          >
            В наличии
          </button>
        </div>

        <button onClick={() => { setForm({ catalog_name: '', operation: 'add', qty_full: 0, qty_no_handle: 0, comment: '' }); setShowForm(true); }}
          className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors">
          + Добавить / Брак
        </button>
        <button onClick={() => openLog()}
          className="px-4 py-2 rounded-xl border border-primary/40 text-primary text-sm hover:border-primary transition-colors">
          История
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Загружаю...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">{search ? 'Ничего не найдено' : 'Нет позиций.'}</p>
      ) : (
        <div className="border border-primary/30 rounded-2xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary/5 text-xs text-primary/70 border-b border-primary/20">
                {whTh('catalog_name', 'Наименование')}
                {whTh('qty_full', 'С ручкой', 'right')}
                {whTh('qty_no_handle', 'Без ручки', 'right')}
                {whTh('total', 'Итого', 'right')}
                {whTh('updated_at', 'Обновлено', 'center')}
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const total = item.qty_full + item.qty_no_handle;
                return (
                  <tr key={item.id > 0 ? item.id : `virtual-${idx}`}
                    className={`border-b border-primary/10 last:border-0 hover:bg-primary/3 ${total === 0 ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5 text-primary font-medium">{item.catalog_name}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-primary">{item.qty_full}</td>
                    <td className="px-4 py-2.5 text-right text-primary/70">{item.qty_no_handle}</td>
                    <td className="px-4 py-2.5 text-right font-bold" style={{ color: total > 0 ? '#6b7c3a' : undefined }}>
                      {total}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                      {item.updated_at ? new Date(item.updated_at).toLocaleDateString('ru-RU') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {item.id > 0 && (
                        <button onClick={() => openLog(item.catalog_name)}
                          className="text-xs text-primary/50 hover:text-primary underline">
                          История
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ФОРМА ОПЕРАЦИИ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-primary text-lg mb-4">Операция со складом</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Наименование *</label>
                <input value={form.catalog_name}
                  onChange={e => setForm(f => ({...f, catalog_name: e.target.value}))}
                  list="warehouse-catalog-names"
                  placeholder="Выберите или введите название"
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
                <datalist id="warehouse-catalog-names">
                  {allNames.map(n => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Операция</label>
                <select value={form.operation}
                  onChange={e => setForm(f => ({...f, operation: e.target.value as 'add' | 'defect'}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent">
                  <option value="add">➕ Ручное добавление</option>
                  <option value="defect">⚠️ Брак</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">С ручкой (шт)</label>
                  <input type="number" min={0} value={form.qty_full}
                    onChange={e => setForm(f => ({...f, qty_full: parseInt(e.target.value)||0}))}
                    className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Без ручки (шт)</label>
                  <input type="number" min={0} value={form.qty_no_handle}
                    onChange={e => setForm(f => ({...f, qty_no_handle: parseInt(e.target.value)||0}))}
                    className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Комментарий</label>
                <input value={form.comment}
                  onChange={e => setForm(f => ({...f, comment: e.target.value}))}
                  placeholder="Необязательно"
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={doOperation} disabled={saving || !form.catalog_name.trim()}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Сохраняю...' : 'Применить'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-sm">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ИСТОРИЯ ДВИЖЕНИЙ */}
      {showLog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowLog(false)}>
          <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-primary text-lg">
                История {logItem ? `— ${logItem}` : '(все позиции)'}
              </h3>
              <button onClick={() => setShowLog(false)} className="text-muted-foreground hover:text-primary text-xl">✕</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {log.length === 0 ? (
                <p className="text-sm text-muted-foreground">Движений нет</p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-background">
                    <tr className="text-xs text-primary/60 border-b border-primary/20">
                      <th className="pb-2 text-left">Дата</th>
                      {!logItem && <th className="pb-2 text-left">Позиция</th>}
                      <th className="pb-2 text-left">Операция</th>
                      <th className="pb-2 text-right">С ручкой</th>
                      <th className="pb-2 text-right">Без ручки</th>
                      <th className="pb-2 text-left pl-3">Комментарий</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.map(e => (
                      <tr key={e.id} className="border-b border-primary/10 last:border-0">
                        <td className="py-2 text-xs text-muted-foreground pr-3 whitespace-nowrap">{fmtDt(e.created_at)}</td>
                        {!logItem && <td className="py-2 text-primary font-medium pr-3 max-w-[160px] truncate">{e.catalog_name}</td>}
                        <td className={`py-2 pr-3 font-medium text-xs ${OP_COLORS[e.operation] || 'text-primary'}`}>
                          {OP_LABELS[e.operation] || e.operation}
                        </td>
                        <td className="py-2 text-right font-bold text-primary">{e.qty_full || '—'}</td>
                        <td className="py-2 text-right text-primary/70">{e.qty_no_handle || '—'}</td>
                        <td className="py-2 text-xs text-muted-foreground pl-3">{e.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWarehouse;
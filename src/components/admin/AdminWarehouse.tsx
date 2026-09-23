import { useState, useEffect } from 'react';
import urls from '../../../backend/func2url.json';
import { displayTitle } from './orderUtils';

interface WarehouseItem {
  id: number;
  catalog_name: string;
  qty_full: number;
  qty_no_handle: number;
  buildable?: number | null;
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

const OP_LABELS: Record<string, string> = {
  income_staff:  'Приход от сотрудников',
  add:           'Ручное добавление',
  defect:        'Брак',
  order_consume: 'Списание в заказ',
  correction:    'Исправление ошибки',
};

const OP_COLORS: Record<string, string> = {
  income_staff:  'text-[#6b7c3a]',
  add:           'text-blue-600',
  defect:        'text-red-500',
  order_consume: 'text-purple-600',
  correction:    'text-orange-600',
};

function fmtDt(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Имя текущего сотрудника — записывается в историю операций склада
function getAuthName(): string {
  try {
    const raw = localStorage.getItem('admin_auth');
    if (raw) {
      const a = JSON.parse(raw);
      return a.full_name || 'Администратор';
    }
  } catch { /* ignore */ }
  return 'Администратор';
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
    catalog_name: '', operation: 'add' as 'add' | 'defect' | 'correction',
    qty_full: 0, qty_no_handle: 0, comment: '',
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [sets, setSets] = useState<Record<string, { item_name: string; qty: number }[]>>({});
  const [openSet, setOpenSet] = useState<string | null>(null);
  const [editSet, setEditSet] = useState<string | null>(null);
  const [setDraft, setSetDraft] = useState<{ item_name: string; qty: number }[]>([]);

  const loadSets = async () => {
    try {
      const res = await fetch(`${urls['reports']}?type=warehouse_sets`);
      const data = await res.json();
      const map: Record<string, { item_name: string; qty: number }[]> = {};
      (data.sets || []).forEach((r: { set_name: string; item_name: string; qty: number }) => {
        (map[r.set_name] = map[r.set_name] || []).push({ item_name: r.item_name, qty: r.qty });
      });
      setSets(map);
    } catch { /* ignore */ }
  };

  const saveSet = async () => {
    if (!editSet) return;
    await fetch(urls['reports'], {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'warehouse_set_items', set_name: editSet, items: setDraft.filter(i => i.item_name) }),
    });
    setEditSet(null);
    await loadSets();
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${urls['reports']}?type=warehouse`);
      const data = await res.json();
      const warehouseItems: WarehouseItem[] = (data.items || [])
        .slice()
        .sort((a: WarehouseItem, b: WarehouseItem) => a.catalog_name.localeCompare(b.catalog_name, 'ru'));
      setItems(warehouseItems);
      // Выпадающий список — только реальные позиции склада:
      // без дублей с размером в скобках и без наборов (они собираются из корзин)
      const plain = new Set(warehouseItems.map(i => i.catalog_name).filter(n => !/\(/.test(n)));
      setAllNames(warehouseItems
        .map(i => i.catalog_name)
        .filter(n => !/набор/i.test(n))
        .filter(n => !/\(/.test(n) || !plain.has(displayTitle(n))));
    } catch { /* fallback */ }
    setLoading(false);
  };

  // Подтянуть новые позиции из «Товаров» на склад
  const syncPositions = async () => {
    setSyncing(true);
    try {
      const res  = await fetch(urls['reports'], {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'warehouse_sync' }),
      });
      const data = await res.json();
      await loadItems();
      alert(data.added > 0 ? `Добавлено новых позиций: ${data.added}` : 'Новых позиций не найдено — склад актуален.');
    } catch { alert('Не удалось обновить позиции'); }
    setSyncing(false);
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

  useEffect(() => { loadItems(); loadSets(); }, []);

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
        body: JSON.stringify({ type: 'warehouse_manual', ...form, created_by: getAuthName() }),
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

  const whTh = (col: WhSortCol, label: string, align = 'left', extraCls = '') => (
    <th className={`px-4 py-3 text-${align} font-semibold cursor-pointer hover:text-primary select-none whitespace-nowrap ${extraCls}`}
      onClick={() => { if (sortCol === col) setSortAsc(v => !v); else { setSortCol(col); setSortAsc(col !== 'qty_full' && col !== 'qty_no_handle' && col !== 'total'); } }}>
      {label}{sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : <span className="opacity-30"> ↕</span>}
    </th>
  );

  const totalFull     = items.filter(i => i.id > 0).reduce((s, i) => s + i.qty_full, 0);
  const totalNoHandle = items.filter(i => i.id > 0).reduce((s, i) => s + i.qty_no_handle, 0);
  const posWithStock  = items.filter(i => (i.qty_full + i.qty_no_handle) > 0).length;

  return (
    <div className="p-6 max-w-5xl">
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
        <button onClick={syncPositions} disabled={syncing}
          className="px-4 py-2 rounded-xl border border-primary/40 text-primary text-sm hover:border-primary transition-colors disabled:opacity-50">
          {syncing ? 'Обновляю...' : '↻ Обновить позиции'}
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
        <div className="border border-primary/30 rounded-2xl overflow-x-auto">
          <table className="text-sm border-collapse min-w-[680px] w-full">
            <thead>
              <tr className="bg-primary/5 text-xs text-primary/70 border-b border-primary/20">
                {whTh('catalog_name', 'Наименование', 'left', 'sticky left-0 z-20 bg-[#faf8f4] shadow-[3px_0_5px_-3px_rgba(0,0,0,0.15)] min-w-[190px]')}
                {whTh('qty_full', 'С ручкой', 'right')}
                {whTh('qty_no_handle', 'Без ручки', 'right')}
                {whTh('total', 'Итого', 'right')}
                {whTh('updated_at', 'Обновлено', 'center')}
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.flatMap((item, idx) => {
                const parts = sets[item.catalog_name] || [];
                const isSet = parts.length > 0 || /набор/i.test(item.catalog_name);
                const qtyOf = (n: string) => {
                  const w = items.find(i => i.catalog_name === n);
                  return w ? w.qty_full + w.qty_no_handle : 0;
                };
                const buildable = item.buildable ?? (parts.length
                  ? Math.min(...parts.map(p => Math.floor(qtyOf(p.item_name) / Math.max(1, p.qty))))
                  : null);
                const total = item.qty_full + item.qty_no_handle;
                const rows = [(
                  <tr key={item.id > 0 ? item.id : `virtual-${idx}`}
                    className={`border-b border-primary/10 last:border-0 hover:bg-primary/3 ${total === 0 && !buildable ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5 text-primary font-medium sticky left-0 z-10 bg-background shadow-[3px_0_5px_-3px_rgba(0,0,0,0.15)]">
                      {isSet ? (
                        <button onClick={() => setOpenSet(v => v === item.catalog_name ? null : item.catalog_name)}
                          className="flex items-center gap-1.5 text-left hover:text-accent-foreground">
                          <span className={`transition-transform ${openSet === item.catalog_name ? 'rotate-90' : ''}`}>▸</span>
                          {displayTitle(item.catalog_name)}
                        </button>
                      ) : displayTitle(item.catalog_name)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-primary">{item.qty_full}</td>
                    <td className="px-4 py-2.5 text-right text-primary/70">{item.qty_no_handle}</td>
                    <td className="px-4 py-2.5 text-right font-bold" style={{ color: total > 0 ? '#6b7c3a' : undefined }}>
                      {buildable !== null && buildable !== undefined ? (
                        <span className="text-blue-600" title="Можно собрать из имеющихся корзин">{buildable}</span>
                      ) : total}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-muted-foreground whitespace-nowrap">
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
                )];
                if (isSet && openSet === item.catalog_name) {
                  if (parts.length === 0) {
                    rows.push(
                      <tr key={`${item.catalog_name}-empty`} className="bg-primary/3 border-b border-primary/10">
                        <td colSpan={6} className="px-4 py-2 pl-10 text-xs text-muted-foreground">Состав набора не указан</td>
                      </tr>
                    );
                  }
                  parts.forEach(p => {
                    const w = items.find(i => i.catalog_name === p.item_name);
                    const pTotal = w ? w.qty_full + w.qty_no_handle : 0;
                    rows.push(
                      <tr key={`${item.catalog_name}-${p.item_name}`}
                        className={`border-b border-primary/10 bg-primary/3 hover:bg-primary/5 ${pTotal === 0 ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-2.5 text-primary font-medium sticky left-0 z-10 bg-[#f6f3ed] shadow-[3px_0_5px_-3px_rgba(0,0,0,0.15)] pl-10">
                          {displayTitle(p.item_name)}{p.qty > 1 ? ` × ${p.qty}` : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-primary">{w ? w.qty_full : 0}</td>
                        <td className="px-4 py-2.5 text-right text-primary/70">{w ? w.qty_no_handle : 0}</td>
                        <td className="px-4 py-2.5 text-right font-bold" style={{ color: pTotal > 0 ? '#6b7c3a' : undefined }}>{pTotal}</td>
                        <td className="px-4 py-2.5 text-center text-xs text-muted-foreground whitespace-nowrap">
                          {w?.updated_at ? new Date(w.updated_at).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => openLog(p.item_name)} className="text-xs text-primary/50 hover:text-primary underline">История</button>
                        </td>
                      </tr>
                    );
                  });
                  rows.push(
                    <tr key={`${item.catalog_name}-cfg`} className="bg-primary/3 border-b border-primary/10">
                      <td colSpan={6} className="px-4 py-1.5 pl-10">
                        <button onClick={() => { setEditSet(item.catalog_name); setSetDraft(parts.length ? [...parts] : [{ item_name: '', qty: 1 }]); }}
                          className="text-xs text-primary/60 hover:text-primary underline">Настроить состав</button>
                      </td>
                    </tr>
                  );
                }
                return rows;
              })}
            </tbody>
          </table>
        </div>
      )}

      {editSet && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditSet(null)}>
          <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-primary text-lg mb-1">Состав набора</h3>
            <p className="text-xs text-muted-foreground mb-4">{displayTitle(editSet)}</p>
            <div className="space-y-2">
              {setDraft.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={row.item_name}
                    onChange={e => setSetDraft(d => d.map((r, j) => j === i ? { ...r, item_name: e.target.value } : r))}
                    className="flex-1 border border-primary/30 rounded-xl px-3 py-2 text-sm bg-background">
                    <option value="">— выберите корзину —</option>
                    {allNames.filter(n => !/набор/i.test(n)).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <input type="number" min={1} value={row.qty}
                    onChange={e => setSetDraft(d => d.map((r, j) => j === i ? { ...r, qty: parseInt(e.target.value) || 1 } : r))}
                    className="w-16 border border-primary/30 rounded-xl px-2 py-2 text-sm text-center" />
                  <button onClick={() => setSetDraft(d => d.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 px-1">✕</button>
                </div>
              ))}
            </div>
            <button onClick={() => setSetDraft(d => [...d, { item_name: '', qty: 1 }])}
              className="text-sm text-primary/70 hover:text-primary underline mt-3">+ Добавить корзину</button>
            <div className="flex gap-2 mt-5">
              <button onClick={saveSet} className="flex-1 px-4 py-2 rounded-xl bg-accent text-accent-foreground font-semibold text-sm">Сохранить</button>
              <button onClick={() => setEditSet(null)} className="px-4 py-2 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
            </div>
          </div>
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
                <select value={form.catalog_name}
                  onChange={e => setForm(f => ({...f, catalog_name: e.target.value}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent bg-background">
                  <option value="">— выберите позицию —</option>
                  {allNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Операция</label>
                <select value={form.operation}
                  onChange={e => setForm(f => ({...f, operation: e.target.value as 'add' | 'defect' | 'correction'}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent bg-background">
                  <option value="add">➕ Ручное добавление</option>
                  <option value="defect">⚠️ Брак</option>
                  <option value="correction">↩️ Исправление ошибки (убрать лишнее)</option>
                </select>
                {form.operation === 'correction' && (
                  <p className="text-[11px] text-orange-600 mt-1">
                    Укажите количество, которое было внесено по ошибке — оно спишется с остатка.
                  </p>
                )}
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
                История {logItem ? `— ${displayTitle(logItem)}` : '(все позиции)'}
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
                      <th className="pb-2 text-left pl-3">Сотрудник</th>
                      <th className="pb-2 text-right">С ручкой</th>
                      <th className="pb-2 text-right">Без ручки</th>
                      <th className="pb-2 text-left pl-3">Комментарий</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.map(e => (
                      <tr key={e.id} className="border-b border-primary/10 last:border-0">
                        <td className="py-2 text-xs text-muted-foreground pr-3 whitespace-nowrap">{fmtDt(e.created_at)}</td>
                        {!logItem && <td className="py-2 text-primary font-medium pr-3 max-w-[160px] truncate">{displayTitle(e.catalog_name)}</td>}
                        <td className={`py-2 pr-3 font-medium text-xs ${OP_COLORS[e.operation] || 'text-primary'}`}>
                          {OP_LABELS[e.operation] || e.operation}
                        </td>
                        <td className="py-2 pl-3 pr-3 text-xs text-primary/80 whitespace-nowrap">{e.created_by || '—'}</td>
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
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

const OP_LABELS: Record<string, string> = {
  income_staff: 'Приход от сотрудников',
  add:          'Ручное добавление',
  defect:       'Брак',
  write_off:    'Списание в заказ',
};

const OP_COLORS: Record<string, string> = {
  income_staff: 'text-[#6b7c3a]',
  add:          'text-blue-600',
  defect:       'text-red-500',
  write_off:    'text-orange-500',
};

function fmtDt(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const AdminWarehouse = () => {
  const [items, setItems]     = useState<WarehouseItem[]>([]);
  const [log, setLog]         = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showLog, setShowLog] = useState(false);
  const [logItem, setLogItem] = useState<string | null>(null);

  // Форма операции
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    catalog_name: '', operation: 'add' as 'add' | 'defect' | 'write_off',
    qty_full: 0, qty_no_handle: 0, comment: '',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${urls['reports']}?type=warehouse`);
      const data = await res.json();
      setItems(data.items || []);
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

  const filtered = items.filter(i =>
    i.catalog_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalFull     = items.reduce((s, i) => s + i.qty_full, 0);
  const totalNoHandle = items.reduce((s, i) => s + i.qty_no_handle, 0);

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="font-display text-2xl font-semibold text-primary mb-1">Склад</h1>

      {/* Сводка */}
      <div className="flex gap-4 mb-5">
        <div className="bg-card border border-primary/30 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Готовых корзин</div>
          <div className="text-2xl font-bold text-primary">{totalFull}</div>
        </div>
        <div className="bg-card border border-primary/30 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Без ручек</div>
          <div className="text-2xl font-bold text-primary">{totalNoHandle}</div>
        </div>
        <div className="bg-card border border-primary/30 rounded-2xl px-5 py-3">
          <div className="text-xs text-muted-foreground">Позиций</div>
          <div className="text-2xl font-bold text-primary">{items.length}</div>
        </div>
      </div>

      {/* Тулбар */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию..."
          className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent flex-1 min-w-[200px]" />
        <button onClick={() => { setForm({ catalog_name: '', operation: 'add', qty_full: 0, qty_no_handle: 0, comment: '' }); setShowForm(true); }}
          className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors">
          + Добавить / Списать
        </button>
        <button onClick={() => openLog()}
          className="px-4 py-2 rounded-xl border border-primary/40 text-primary text-sm hover:border-primary transition-colors">
          История движений
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Загружаю...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">
          {search ? 'Ничего не найдено' : 'Склад пуст. Данные появятся когда сотрудники отправят отчёты.'}
        </p>
      ) : (
        <div className="border border-primary/30 rounded-2xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary/5 text-xs text-primary/70 border-b border-primary/20">
                <th className="px-4 py-3 text-left font-semibold">Наименование</th>
                <th className="px-4 py-3 text-right font-semibold">С ручкой</th>
                <th className="px-4 py-3 text-right font-semibold">Без ручки</th>
                <th className="px-4 py-3 text-right font-semibold">Итого</th>
                <th className="px-4 py-3 text-center font-semibold w-24">Обновлено</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-primary/10 last:border-0 hover:bg-primary/3">
                  <td className="px-4 py-3 text-primary font-medium">{item.catalog_name}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{item.qty_full}</td>
                  <td className="px-4 py-3 text-right text-primary/70">{item.qty_no_handle}</td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: '#6b7c3a' }}>
                    {item.qty_full + item.qty_no_handle}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                    {item.updated_at ? new Date(item.updated_at).toLocaleDateString('ru-RU') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openLog(item.catalog_name)}
                      className="text-xs text-primary/50 hover:text-primary underline">
                      История
                    </button>
                  </td>
                </tr>
              ))}
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
                  list="warehouse-names"
                  placeholder="Название корзины как в каталоге"
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
                <datalist id="warehouse-names">
                  {items.map(i => <option key={i.id} value={i.catalog_name} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Операция</label>
                <select value={form.operation}
                  onChange={e => setForm(f => ({...f, operation: e.target.value as typeof form.operation}))}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent">
                  <option value="add">➕ Ручное добавление</option>
                  <option value="defect">⚠️ Брак</option>
                  <option value="write_off">📦 Списание в заказ</option>
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

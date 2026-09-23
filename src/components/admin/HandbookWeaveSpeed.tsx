import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';

interface SpeedRow {
  position: string;
  category: string;
  staff_id: number;
  staff_name: string;
  month: string;
  speed: number;
  days: number;
}

const CAT_OPTIONS: { key: string; label: string }[] = [
  { key: 'whole', label: 'С ручкой' },
  { key: 'whole_ears', label: 'С ушами' },
  { key: 'no_handle', label: 'Без ручки' },
  { key: 'handle', label: 'Ручка' },
  { key: 'ears', label: 'Уши' },
];

const MONTH_NAMES = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null;

const HandbookWeaveSpeed = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<SpeedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fMonths, setFMonths] = useState<string[]>([]);
  const [fStaff, setFStaff] = useState<number[]>([]);
  const [fPos, setFPos] = useState<string[]>([]);
  const [fCat, setFCat] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${urls['reports']}?type=weave_speed&year=${year}`)
      .then(r => r.json())
      .then(d => setRows(d.rows || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [year]);

  const monthCols = useMemo(() => {
    const all = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    return fMonths.length ? all.filter(m => fMonths.includes(m)) : all;
  }, [year, fMonths]);

  const allStaff = useMemo(() => {
    const m = new Map<number, string>();
    rows.forEach(r => m.set(r.staff_id, r.staff_name));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ru'));
  }, [rows]);

  const allPositions = useMemo(
    () => [...new Set(rows.map(r => r.position))].sort((a, b) => a.localeCompare(b, 'ru')),
    [rows]);

  const filtered = useMemo(() => rows.filter(r =>
    (!fMonths.length || fMonths.includes(r.month)) &&
    (!fStaff.length || fStaff.includes(r.staff_id)) &&
    (!fPos.length || fPos.includes(r.position)) &&
    (!fCat.length || fCat.includes(r.category))
  ), [rows, fMonths, fStaff, fPos, fCat]);

  const tree = useMemo(() => {
    const byPos = new Map<string, Map<number, { name: string; cells: Map<string, number> }>>();
    filtered.forEach(r => {
      const staffMap = byPos.get(r.position) || new Map();
      byPos.set(r.position, staffMap);
      const entry = staffMap.get(r.staff_id) || { name: r.staff_name, cells: new Map() };
      staffMap.set(r.staff_id, entry);
      entry.cells.set(r.month, r.speed);
    });
    return [...byPos.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'));
  }, [filtered]);

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const Filter = ({ id, label, items, sel, onToggle, onClear }: {
    id: string; label: string; items: { v: string | number; l: string }[];
    sel: (string | number)[]; onToggle: (v: never) => void; onClear: () => void;
  }) => (
    <div className="relative">
      <button onClick={() => setOpenFilter(openFilter === id ? null : id)}
        className={`px-3 py-1.5 rounded-xl border text-sm transition-colors flex items-center gap-1.5 ${
          sel.length ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'}`}>
        {label}{sel.length > 0 && ` (${sel.length})`}
        <Icon name="ChevronDown" size={14} />
      </button>
      {openFilter === id && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpenFilter(null)} />
          <div className="absolute z-40 mt-1 bg-background border border-border rounded-xl shadow-lg p-2 max-h-72 overflow-y-auto min-w-[220px]">
            <button onClick={onClear} className="text-xs text-muted-foreground hover:text-primary px-2 py-1">Сбросить</button>
            {items.map(it => (
              <label key={String(it.v)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/40 cursor-pointer text-sm">
                <input type="checkbox" checked={sel.includes(it.v)} onChange={() => onToggle(it.v as never)} />
                <span className="truncate">{it.l}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={year} onChange={e => { setYear(Number(e.target.value)); setFMonths([]); }}
          className="px-3 py-1.5 rounded-xl border border-primary/40 text-sm bg-background text-primary">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <Filter id="m" label="Месяцы"
          items={Array.from({ length: 12 }, (_, i) => ({ v: `${year}-${String(i + 1).padStart(2, '0')}`, l: MONTH_NAMES[i] }))}
          sel={fMonths} onToggle={v => toggle(fMonths, v as string, setFMonths)} onClear={() => setFMonths([])} />
        <Filter id="s" label="Сотрудники" items={allStaff.map(([id, n]) => ({ v: id, l: n }))}
          sel={fStaff} onToggle={v => toggle(fStaff, v as number, setFStaff)} onClear={() => setFStaff([])} />
        <Filter id="p" label="Позиция" items={allPositions.map(p => ({ v: p, l: p }))}
          sel={fPos} onToggle={v => toggle(fPos, v as string, setFPos)} onClear={() => setFPos([])} />
        <Filter id="c" label="Вид корзины" items={CAT_OPTIONS.map(c => ({ v: c.key, l: c.label }))}
          sel={fCat} onToggle={v => toggle(fCat, v as string, setFCat)} onClear={() => setFCat([])} />
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Скорость = корзин за 8 часов. В расчёт берутся только дни, когда сотрудник делал ровно одну позицию.
        По месяцу выводится среднее значение.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Считаю...</p>
      ) : tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет данных за выбранный период</p>
      ) : (
        <div className="overflow-x-auto border border-border rounded-2xl">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-secondary/60">
                <th className="text-left px-3 py-2 font-medium sticky left-0 bg-secondary/60 min-w-[240px] border-r border-border">Позиция / сотрудник</th>
                {monthCols.map(m => (
                  <th key={m} className="px-2 py-2 font-medium text-center whitespace-nowrap border-r border-border text-xs">
                    {MONTH_NAMES[Number(m.slice(5)) - 1]}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium text-center text-xs">Общий итог</th>
              </tr>
            </thead>
            <tbody>
              {tree.map(([position, staffMap]) => {
                const posCell = (m: string) => avg([...staffMap.values()].map(s => s.cells.get(m)).filter((v): v is number => v != null));
                const posTotal = avg([...staffMap.values()].flatMap(s => [...s.cells.values()].filter((_, i) => monthCols.includes([...s.cells.keys()][i]))));
                return [
                  <tr key={position} className="bg-secondary/30 font-semibold border-t border-border">
                    <td className="px-3 py-2 sticky left-0 bg-secondary/30 border-r border-border">{position}</td>
                    {monthCols.map(m => (
                      <td key={m} className="px-2 py-2 text-center border-r border-border">{posCell(m) ?? '—'}</td>
                    ))}
                    <td className="px-3 py-2 text-center">{posTotal ?? '—'}</td>
                  </tr>,
                  ...[...staffMap.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, 'ru')).map(([sid, s]) => {
                    const total = avg(monthCols.map(m => s.cells.get(m)).filter((v): v is number => v != null));
                    return (
                      <tr key={`${position}-${sid}`} className="border-t border-border/60 hover:bg-secondary/20">
                        <td className="px-3 py-1.5 pl-8 sticky left-0 bg-background border-r border-border text-muted-foreground">{s.name}</td>
                        {monthCols.map(m => (
                          <td key={m} className="px-2 py-1.5 text-center border-r border-border">
                            {s.cells.get(m) != null ? s.cells.get(m) : '—'}
                          </td>
                        ))}
                        <td className="px-3 py-1.5 text-center font-medium">{total ?? '—'}</td>
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HandbookWeaveSpeed;

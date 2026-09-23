import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';

// ── Выпадающий список с галочками ─────────────────────────────────────────────
export default function MultiSelect<T extends string | number>({ label, options, selected, onToggle, width = 'w-52' }: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const text = selected.length === 0 ? 'Все'
    : selected.length <= 2
      ? options.filter(o => selected.includes(o.value)).map(o => o.label).join(', ')
      : `Выбрано: ${selected.length}`;

  return (
    <div className={`relative ${width}`} ref={ref}>
      <label className="text-[11px] text-primary/50 block mb-1">{label}</label>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 border border-primary/30 rounded-xl px-3 py-2 text-sm bg-background hover:border-primary transition-colors">
        <span className="truncate text-primary">{text}</span>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-primary/40 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-background border border-primary/30 rounded-xl shadow-lg py-1">
          {options.map(o => (
            <button key={String(o.value)} onClick={() => onToggle(o.value)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-primary/5 transition-colors">
              <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                selected.includes(o.value) ? 'bg-accent border-accent' : 'border-primary/30'
              }`}>
                {selected.includes(o.value) && <Icon name="Check" size={11} className="text-accent-foreground" />}
              </span>
              <span className="text-primary truncate">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


import Icon from '@/components/ui/icon';
import { DayReport, ReportPosition, fmtRub, rowKey, CATEGORY_LABEL, OLIVE } from './staffCabinetUtils';

interface StaffCabinetEditDayModalProps {
  editingDay: DayReport;
  setEditingDay: (v: DayReport | null) => void;
  editingDayPositions: ReportPosition[];
  setEditingDayPositions: (fn: (prev: ReportPosition[]) => ReportPosition[]) => void;
  editingDayTotal: number;
  editingDaySaving: boolean;
  saveEditingDay: () => void;
}

const StaffCabinetEditDayModal = ({
  editingDay, setEditingDay, editingDayPositions, setEditingDayPositions,
  editingDayTotal, editingDaySaving, saveEditingDay,
}: StaffCabinetEditDayModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditingDay(null)}>
      <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-primary text-lg">
            {new Date(editingDay.report_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </h3>
          <button onClick={() => setEditingDay(null)} className="text-muted-foreground hover:text-primary text-xl">✕</button>
        </div>

        {editingDayPositions.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">Позиций нет</p>
        ) : (
          <div className="space-y-2 mb-4">
            {editingDayPositions.map((item, i) => (
              <div key={rowKey(item.position_id, item.category) + i} className="flex items-center justify-between gap-2 border-b border-primary/10 pb-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-primary truncate">{item.staff_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {CATEGORY_LABEL[item.category]}{item.weave_type ? ` · ${item.weave_type}` : ''} · {item.price.toLocaleString('ru-RU')} ₽/шт
                  </div>
                </div>
                <input type="number" min={0} value={item.qty}
                  onChange={e => {
                    const qty = parseInt(e.target.value, 10) || 0;
                    setEditingDayPositions(prev => qty <= 0
                      ? prev.filter((_, idx) => idx !== i)
                      : prev.map((p, idx) => idx === i ? { ...p, qty } : p));
                  }}
                  className="w-14 text-center border border-primary/30 rounded-lg px-1 py-1 text-sm outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <span className="text-sm font-semibold w-20 text-right" style={{ color: OLIVE }}>{fmtRub(item.qty * item.price)}</span>
                <button onClick={() => setEditingDayPositions(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                  <Icon name="Trash2" size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">Итого</span>
          <span className="text-lg font-bold text-primary">{fmtRub(editingDayTotal)}</span>
        </div>

        <div className="flex gap-2">
          <button onClick={saveEditingDay} disabled={editingDaySaving}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
            {editingDaySaving ? 'Сохраняю...' : 'Сохранить'}
          </button>
          <button onClick={() => setEditingDay(null)} className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
        </div>
      </div>
    </div>
  );
};

export default StaffCabinetEditDayModal;

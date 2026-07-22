import Icon from '@/components/ui/icon';
import {
  Category, CATEGORY_KEYS, CATEGORY_LABEL, MergedPosition, ReportPosition, DayReport, Plan,
  categoryPrice, isoToday, fmtRub, rowKey, OLIVE,
} from './staffCabinetUtils';

interface StaffCabinetDayTabProps {
  selectedDate: string;
  setSelectedDate: (v: string) => void;
  timeStart: string;
  setTimeStart: (v: string) => void;
  timeEnd: string;
  setTimeEnd: (v: string) => void;
  hoursWorked: number;
  isToday: boolean;
  canEdit: boolean;
  dayReport: DayReport | null;
  submitError: string;
  summaryOpen: boolean;
  setSummaryOpen: (fn: (v: boolean) => boolean) => void;
  totalRub: number;
  plan: Plan | null;
  editPositions: ReportPosition[];
  editSummaryQty: (positionId: number, cat: Category, qty: number) => void;
  removeSummaryItem: (positionId: number, cat: Category) => void;
  saving: boolean;
  saved: boolean;
  saveReport: () => void;
  sortedPositions: MergedPosition[];
  openPositions: Record<number, boolean>;
  setOpenPositions: (fn: (p: Record<number, boolean>) => Record<number, boolean>) => void;
  selectedRow: Record<number, number>;
  setSelectedRow: (fn: (p: Record<number, number>) => Record<number, number>) => void;
  getDraft: (positionId: number, cat: Category) => number;
  setDraft: (positionId: number, cat: Category, qty: number) => void;
  addToReport: (row: MergedPosition) => void;
}

const StaffCabinetDayTab = ({
  selectedDate, setSelectedDate, timeStart, setTimeStart, timeEnd, setTimeEnd, hoursWorked,
  isToday, canEdit, dayReport, submitError, summaryOpen, setSummaryOpen, totalRub, plan,
  editPositions, editSummaryQty, removeSummaryItem, saving, saved, saveReport,
  sortedPositions, openPositions, setOpenPositions, selectedRow, setSelectedRow,
  getDraft, setDraft, addToReport,
}: StaffCabinetDayTabProps) => {
  return (
    <div>
      {/* Дата и время — обязательны */}
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Дата *</label>
          <input type="date" value={selectedDate}
            max={isoToday()}
            onChange={e => setSelectedDate(e.target.value)}
            className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Начало работы *</label>
          <input type="time" value={timeStart} disabled={!canEdit}
            onChange={e => setTimeStart(e.target.value)}
            className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Окончание работы *</label>
          <input type="time" value={timeEnd} disabled={!canEdit}
            onChange={e => setTimeEnd(e.target.value)}
            className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60" />
        </div>
        {hoursWorked > 0 && (
          <span className="text-xs text-muted-foreground pb-2.5">{hoursWorked} ч</span>
        )}
        {!isToday && (
          <span className="text-xs text-muted-foreground pb-2.5">Прошлые дни только для просмотра</span>
        )}
        {dayReport?.locked && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg mb-0.5">Заблокирован для редактирования</span>
        )}
      </div>
      {submitError && <p className="text-xs text-red-500 mb-4">{submitError}</p>}

      {/* Итого — сворачиваемый блок */}
      <div className="border border-primary/30 rounded-2xl mb-5 overflow-hidden">
        <button onClick={() => setSummaryOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-primary/5 hover:bg-primary/8 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-primary">Итого за день</span>
            <span className="text-lg font-bold text-primary">{fmtRub(totalRub)}</span>
            {plan && plan.daily_plan_rub > 0 && (
              <span className="text-xs text-muted-foreground">План: {fmtRub(plan.daily_plan_rub)} · {Math.round(totalRub / plan.daily_plan_rub * 100)}%</span>
            )}
          </div>
          <Icon name={summaryOpen ? 'ChevronUp' : 'ChevronDown'} size={18} className="text-primary/60" />
        </button>

        {summaryOpen && (
          <div className="divide-y divide-primary/10">
            {editPositions.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">Пока ничего не добавлено</p>
            ) : editPositions.map(item => (
              <div key={rowKey(item.position_id, item.category)} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-primary truncate">{item.staff_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {CATEGORY_LABEL[item.category]}{item.weave_type ? ` · ${item.weave_type}` : ''} · {item.price.toLocaleString('ru-RU')} ₽/шт
                  </div>
                </div>
                {canEdit ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input type="number" min={0} value={item.qty}
                      onChange={e => editSummaryQty(item.position_id, item.category, parseInt(e.target.value, 10) || 0)}
                      className="w-14 text-center border border-primary/30 rounded-lg px-1 py-1 text-sm outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <span className="text-sm font-semibold w-20 text-right" style={{ color: OLIVE }}>{fmtRub(item.qty * item.price)}</span>
                    <button onClick={() => removeSummaryItem(item.position_id, item.category)} className="text-red-400 hover:text-red-600">
                      <Icon name="Trash2" size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-primary w-10 text-center">{item.qty}</span>
                    <span className="text-sm font-semibold w-20 text-right" style={{ color: OLIVE }}>{fmtRub(item.qty * item.price)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {canEdit && (
          <div className="px-4 py-3 border-t border-primary/10 flex justify-end">
            <button onClick={saveReport} disabled={saving || editPositions.length === 0}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 bg-accent hover:bg-accent/90 text-accent-foreground">
              {saving ? 'Отправляю...' : saved ? '✓ Отправлено!' : 'Отправить отчёт'}
            </button>
          </div>
        )}
      </div>

      {/* Позиции — плоский список, сортировка по sort_order из справочника */}
      <div className="space-y-2 mb-5">
        {sortedPositions.map(row => {
          const isPosOpen = !!openPositions[row.id];
          const selectedId = selectedRow[row.id] ?? row.id;
          const activeRow = sortedPositions.find(r => r.id === selectedId) || row;
          const cats = CATEGORY_KEYS.filter(c => categoryPrice(activeRow, c) > 0);
          // Другие варианты плетения для этой же позиции (совпадающие по catalog_name)
          const weaveVariants = sortedPositions.filter(r => r.catalog_name && r.catalog_name === row.catalog_name && r.weave_type);
          const showWeaveButtons = weaveVariants.length > 1;

          return (
            <div key={row.id} className="border border-primary/30 rounded-2xl overflow-hidden">
              <button onClick={() => setOpenPositions(p => ({ ...p, [row.id]: !p[row.id] }))}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-primary/5 hover:bg-primary/8 transition-colors">
                <span className="font-semibold text-primary text-sm">{row.staff_name}</span>
                <Icon name={isPosOpen ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-primary/50" />
              </button>

              {isPosOpen && (
                <div className="px-4 py-3">
                  {showWeaveButtons && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {weaveVariants.map(r => (
                        <button key={r.id}
                          onClick={() => setSelectedRow(p => ({ ...p, [row.id]: r.id }))}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                            selectedId === r.id ? 'bg-primary text-white border-primary' : 'border-primary/30 text-primary hover:border-primary'
                          }`}>
                          {r.weave_type}
                        </button>
                      ))}
                    </div>
                  )}

                  {cats.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Нет цен для этой позиции</p>
                  ) : (
                    <div className="space-y-2">
                      {cats.map(cat => {
                        const price = categoryPrice(activeRow, cat);
                        const qty   = getDraft(activeRow.id, cat);
                        return (
                          <div key={cat} className="flex items-center gap-3">
                            <span className="text-sm text-primary flex-1">{CATEGORY_LABEL[cat]}</span>
                            <input type="number" min={0} placeholder="0" value={qty || ''}
                              onChange={e => setDraft(activeRow.id, cat, parseInt(e.target.value, 10) || 0)}
                              className="w-16 text-center border border-primary/30 rounded-lg px-1 py-1.5 text-sm outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            <span className="text-xs text-muted-foreground w-20 text-right">{price.toLocaleString('ru-RU')} ₽</span>
                            <span className="text-sm font-semibold w-20 text-right" style={{ color: OLIVE }}>{qty > 0 ? fmtRub(qty * price) : '—'}</span>
                          </div>
                        );
                      })}
                      <div className="flex justify-end pt-1">
                        <button onClick={() => addToReport(activeRow)}
                          className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold transition-colors">
                          + Добавить в отчёт
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {sortedPositions.length === 0 && (
          <p className="text-sm text-muted-foreground">Позиции ещё не добавлены в справочник</p>
        )}
      </div>

      {/* % выполнения дня */}
      {dayReport && plan && plan.daily_plan_rub > 0 && (
        <div className="p-4 bg-card border border-primary/30 rounded-2xl">
          <div className="text-sm font-semibold text-primary mb-2">Выполнение дневного плана</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full bg-primary/10 overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round(dayReport.total_rub / plan.daily_plan_rub * 100))}%`, backgroundColor: '#8a9a5a' }} />
            </div>
            <span className="text-sm font-bold" style={{ color: OLIVE }}>
              {Math.round(dayReport.total_rub / plan.daily_plan_rub * 100)}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {fmtRub(dayReport.total_rub)} из {fmtRub(plan.daily_plan_rub)}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCabinetDayTab;

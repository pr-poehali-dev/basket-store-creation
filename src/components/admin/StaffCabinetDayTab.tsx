import { useState, useMemo, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import {
  Category, CATEGORY_KEYS, CATEGORY_LABEL, MergedPosition, ReportPosition, DayReport, Plan,
  categoryPrice, isoToday, fmtRub, rowKey, OLIVE, baseName,
} from './staffCabinetUtils';

interface StaffCabinetDayTabProps {
  staffId?: number;
  monthEarned?: number;
  planMonthRub?: number;
  onRequestEdit?: (comment: string) => void;
  editRequestSent?: boolean;
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
  staffId, monthEarned = 0, planMonthRub = 0, onRequestEdit, editRequestSent,
  selectedDate, setSelectedDate, timeStart, setTimeStart, timeEnd, setTimeEnd, hoursWorked,
  canEdit, dayReport, submitError, summaryOpen, setSummaryOpen, totalRub, plan,
  editPositions, editSummaryQty, removeSummaryItem, saving, saved, saveReport,
  sortedPositions, openPositions, setOpenPositions, selectedRow, setSelectedRow,
  getDraft, setDraft, addToReport,
}: StaffCabinetDayTabProps) => {
  // Избранные подкатегории — свои у каждого сотрудника, сохраняются между входами
  const favKey = `cabinet_fav_groups_${staffId || 'anon'}`;
  const [favGroups, setFavGroups] = useState<string[]>([]);
  useEffect(() => {
    try { setFavGroups(JSON.parse(localStorage.getItem(favKey) || '[]')); } catch { setFavGroups([]); }
  }, [favKey]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [editRequestOpen, setEditRequestOpen] = useState(false);
  const [editComment, setEditComment] = useState('');
  useEffect(() => { setEditRequestOpen(false); setEditComment(''); }, [selectedDate]);

  const toggleFav = (g: string) => {
    setFavGroups(prev => {
      const next = prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g];
      localStorage.setItem(favKey, JSON.stringify(next));
      return next;
    });
  };

  // Варианты плетения одной и той же позиции объединяются в одну карточку
  const variantsByBase = useMemo(() => {
    const m = new Map<string, MergedPosition[]>();
    for (const r of sortedPositions) {
      const k = `${(r.position_group || '').trim()}::${baseName(r.staff_name, r.weave_type)}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return m;
  }, [sortedPositions]);

  const displayPositions = useMemo(
    () => Array.from(variantsByBase.values()).map(v => v[0]), [variantsByBase]);

  // Группировка по подкатегории (position_group); без подкатегории — позиция сама по себе.
  // Подкатегория «ДРУГОЕ» всегда идёт первой в списке.
  const groupedPositions = useMemo(() => {
    const map = new Map<string, MergedPosition[]>();
    for (const r of displayPositions) {
      const g = (r.position_group || '').trim();
      const key = g || `__solo_${r.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    const isOther = (k: string) => k.trim().toLowerCase() === 'другое';
    return Array.from(map.entries()).sort((a, b) => {
      if (isOther(a[0]) !== isOther(b[0])) return isOther(a[0]) ? -1 : 1;
      const af = favGroups.includes(a[0]) ? 0 : 1;
      const bf = favGroups.includes(b[0]) ? 0 : 1;
      const an = a[0].startsWith('__solo_') ? a[1][0].staff_name : a[0];
      const bn = b[0].startsWith('__solo_') ? b[1][0].staff_name : b[0];
      return af - bf || an.localeCompare(bn, 'ru');
    });
  }, [displayPositions, favGroups]);

  const renderRow = (row: MergedPosition, _k: string, _f: boolean) => {
          const isPosOpen = !!openPositions[row.id];
          const selectedId = selectedRow[row.id] ?? row.id;
          const activeRow = sortedPositions.find(r => r.id === selectedId) || row;
          const cats = CATEGORY_KEYS.filter(c => categoryPrice(activeRow, c) > 0);
          // Варианты плетения этой же позиции
          const weaveVariants = variantsByBase.get(
            `${(row.position_group || '').trim()}::${baseName(row.staff_name, row.weave_type)}`) || [row];
          // Кнопка вида плетения показывается всегда, когда плетение указано
          const showWeaveButtons = weaveVariants.some(r => !!(r.weave_type || '').trim());

          return (
            <div className="border border-primary/30 rounded-2xl overflow-hidden">
              <button onClick={() => setOpenPositions(p => ({ ...p, [row.id]: !p[row.id] }))}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-primary/5 hover:bg-primary/8 transition-colors">
                <span className="font-semibold text-primary text-sm">{baseName(row.staff_name, row.weave_type)}</span>
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
                          <div key={cat} className="flex items-center gap-2">
                            <span className="text-sm text-primary flex-1 min-w-0 md:flex-1 w-[86px] flex-shrink-0 md:w-auto">{CATEGORY_LABEL[cat]}</span>
                            <input type="number" min={0} placeholder="0" value={qty || ''}
                              onChange={e => setDraft(activeRow.id, cat, parseInt(e.target.value, 10) || 0)}
                              className="w-14 md:w-16 flex-shrink-0 text-center border border-primary/30 rounded-lg px-1 py-1.5 text-sm outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            <span className="text-xs text-muted-foreground w-14 md:w-16 flex-shrink-0 text-center md:text-left md:pl-2">{price.toLocaleString('ru-RU')} ₽</span>
                            <span className="text-sm font-semibold w-16 md:w-20 flex-shrink-0 text-right" style={{ color: OLIVE }}>{qty > 0 ? fmtRub(qty * price) : '—'}</span>
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
  };

  return (
    <div>
      {/* Дата и время — обязательны */}
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Дата *</label>
          <input type="date" value={selectedDate}
            max={isoToday()}
            onChange={e => setSelectedDate(e.target.value)}
            className="border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent bg-primary/10" />
        </div>
        <div className="flex gap-6 md:gap-2 items-end">
          <div className="flex-shrink-0 md:flex-1">
            <label className="text-xs text-muted-foreground block mb-1 whitespace-nowrap">Начало работы *</label>
            <input type="time" value={timeStart} disabled={!canEdit}
              onChange={e => setTimeStart(e.target.value)}
              className="w-[115px] md:w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60 bg-primary/10" />
          </div>
          <div className="flex-shrink-0 md:flex-1">
            <label className="text-xs text-muted-foreground block mb-1 whitespace-nowrap">Окончание работы *</label>
            <input type="time" value={timeEnd} disabled={!canEdit}
              onChange={e => setTimeEnd(e.target.value)}
              className="w-[115px] md:w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60 bg-primary/10" />
          </div>
        </div>
        {hoursWorked > 0 && (
          <span className="text-xs text-muted-foreground pb-2.5">{hoursWorked} ч</span>
        )}
      </div>

      {!canEdit && (
        <div className="mb-4 p-3 rounded-2xl border border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon name="Lock" size={14} className="text-amber-600" />
            <span className="text-xs text-amber-700">
              {dayReport?.locked ? 'Отчёт заблокирован для редактирования' : 'День закрыт — редактирование недоступно'}
            </span>
            {onRequestEdit && !editRequestSent && !editRequestOpen && (
              <button onClick={() => setEditRequestOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-amber-400 text-amber-700 text-xs font-medium hover:bg-amber-100">
                Запросить редактирование
              </button>
            )}
            {editRequestSent && <span className="text-xs font-medium text-amber-700">Запрос отправлен</span>}
          </div>
          {editRequestOpen && !editRequestSent && (
            <div className="mt-3 space-y-2">
              <textarea value={editComment} onChange={e => setEditComment(e.target.value)} rows={2}
                placeholder="Опишите, что именно нужно исправить *"
                className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 bg-white" />
              <div className="flex gap-2">
                <button onClick={() => { onRequestEdit?.(editComment.trim()); setEditRequestOpen(false); }}
                  disabled={!editComment.trim()}
                  className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold disabled:opacity-50">
                  Отправить запрос
                </button>
                <button onClick={() => setEditRequestOpen(false)}
                  className="px-4 py-1.5 rounded-xl border border-amber-300 text-amber-700 text-xs">Отмена</button>
              </div>
            </div>
          )}
        </div>
      )}
      {submitError && <p className="text-xs text-red-500 mb-4">{submitError}</p>}

      {/* Выполнение месячного плана */}
      {planMonthRub > 0 && (
        <div className="p-4 bg-card border border-primary/30 rounded-2xl mb-4">
          <div className="text-sm font-semibold text-primary mb-2">Выполнение плана за месяц</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full bg-primary/10 overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round(monthEarned / planMonthRub * 100))}%`, backgroundColor: '#8a9a5a' }} />
            </div>
            <span className="text-sm font-bold" style={{ color: OLIVE }}>
              {Math.round(monthEarned / planMonthRub * 100)}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {fmtRub(monthEarned)} из {fmtRub(planMonthRub)}
          </div>
        </div>
      )}

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
              <div key={rowKey(item.position_id, item.category)} className="flex items-center justify-between gap-2 md:gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-primary truncate">{item.staff_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {CATEGORY_LABEL[item.category]}{item.weave_type ? ` · ${item.weave_type}` : ''}
                    <span className="hidden md:inline"> · {item.price.toLocaleString('ru-RU')} ₽/шт</span>
                  </div>
                </div>
                {canEdit ? (
                  <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                    <input type="number" min={0} value={item.qty || ''} placeholder="0"
                      onChange={e => editSummaryQty(item.position_id, item.category, parseInt(e.target.value, 10) || 0)}
                      className="w-12 md:w-14 text-center border border-primary/30 rounded-lg px-1 py-1 text-sm outline-none focus:border-accent [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <span className="md:hidden text-[11px] text-muted-foreground w-12 text-center">{item.price.toLocaleString('ru-RU')} ₽</span>
                    <span className="text-sm font-semibold w-16 md:w-20 text-right" style={{ color: OLIVE }}>{fmtRub(item.qty * item.price)}</span>
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

      {/* Позиции — сгруппированы по подкатегориям (position_group), избранные вверху */}
      <div className={`space-y-2 mb-5 ${canEdit ? '' : 'hidden'}`}>
        {groupedPositions.map(([groupKey, groupRows]) => {
          const isSolo = groupKey.startsWith('__solo_');
          const groupName = isSolo
            ? baseName(groupRows[0].staff_name, groupRows[0].weave_type)
            : groupKey;
          const isFav      = favGroups.includes(groupKey);
          const isGroupOpen = !!openGroups[groupKey];
          return (
          <div key={groupName} className="border border-primary/30 rounded-2xl overflow-hidden">
            <div className="w-full flex items-center gap-2 px-3 py-2.5 bg-primary/8">
              <button onClick={() => toggleFav(groupKey)} title="В избранное"
                className="flex-shrink-0 transition-transform active:scale-90">
                <Icon name="Heart" size={18}
                  className={isFav ? 'text-red-500 fill-red-500' : 'text-primary/30'} />
              </button>
              <button onClick={() => setOpenGroups(p => ({ ...p, [groupKey]: !p[groupKey] }))}
                className="flex-1 flex items-center justify-between min-w-0">
                <span className="font-bold text-primary text-sm truncate">{groupName}</span>
                <Icon name={isGroupOpen ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-primary/50" />
              </button>
            </div>
            {isGroupOpen && (
        <div className="p-2 space-y-2">
        {groupRows.map(row => <div key={row.id}>{renderRow(row, groupKey, isFav)}</div>)}
        </div>
            )}
          </div>
          );
        })}
        {sortedPositions.length === 0 && (
          <p className="text-sm text-muted-foreground">Позиции ещё не добавлены в справочник</p>
        )}
      </div>

    </div>
  );
};

export default StaffCabinetDayTab;
import Icon from '@/components/ui/icon';
import { useState } from 'react';
import { CATEGORY_LABEL, DayReport, Plan, bonusFor, fmtMonth, fmtRub, isDateEditable, OLIVE } from './staffCabinetUtils';

interface StaffCabinetStatsTabProps {
  statsPeriod: 'days' | 'months';
  setStatsPeriod: (v: 'days' | 'months') => void;
  monthEarned: number;
  monthDays: number;
  weekEarned: number;
  weekReports: DayReport[];
  plan: Plan | null;
  planPct: number;
  remainingToPlan: number;
  monthReports: DayReport[];
  monthsList: [string, number][];
  monthBonuses?: Record<string, number>;
  planMonthRub: number;
  openDayEdit: (r: DayReport) => void;
  onRequestEdit?: (date: string, comment: string) => void;
}

const StaffCabinetStatsTab = ({
  statsPeriod, setStatsPeriod, monthEarned, monthDays, weekEarned, weekReports,
  plan, planPct, remainingToPlan, monthReports, monthsList, monthBonuses = {}, planMonthRub, openDayEdit, onRequestEdit,
}: StaffCabinetStatsTabProps) => {
  const [reqFor, setReqFor] = useState<string | null>(null);
  const [reqComment, setReqComment] = useState('');
  const [sentDates, setSentDates] = useState<string[]>([]);
  const [openDay, setOpenDay] = useState<string | null>(null);
  return (
    <div>
      <div className="flex gap-2 mb-5">
        <button onClick={() => setStatsPeriod('days')}
          className={`px-3 py-1.5 rounded-xl border text-sm transition-colors ${statsPeriod === 'days' ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'}`}>
          По дням
        </button>
        <button onClick={() => setStatsPeriod('months')}
          className={`px-3 py-1.5 rounded-xl border text-sm transition-colors ${statsPeriod === 'months' ? 'bg-primary text-white border-primary' : 'border-primary/40 text-primary hover:border-primary'}`}>
          По месяцам
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-card border border-primary/30 rounded-2xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Этот месяц</div>
          <div className="text-xl font-bold text-primary">{fmtRub(monthEarned)}</div>
          <div className="text-xs text-muted-foreground">{monthDays} дней</div>
        </div>
        <div className="bg-card border border-primary/30 rounded-2xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Эта неделя</div>
          <div className="text-xl font-bold text-primary">{fmtRub(weekEarned)}</div>
          <div className="text-xs text-muted-foreground">{weekReports.length} дней</div>
        </div>
        {plan && plan.daily_plan_rub > 0 && (
          <div className="bg-card border border-primary/30 rounded-2xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Выполнение плана</div>
            <div className="text-xl font-bold" style={{ color: OLIVE }}>{planPct}%</div>
            <div className="h-2 rounded-full bg-primary/10 mt-1.5 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${planPct}%`, backgroundColor: '#8a9a5a' }} />
            </div>
          </div>
        )}
        {plan && plan.daily_plan_rub > 0 && (
          <div className="bg-card border border-primary/30 rounded-2xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Осталось до плана</div>
            <div className="text-xl font-bold text-primary">{fmtRub(remainingToPlan)}</div>
          </div>
        )}
      </div>

      {statsPeriod === 'days' ? (
        <div className="border border-primary/30 rounded-2xl overflow-hidden">
          <div className="bg-primary/5 px-4 py-2 grid grid-cols-3 text-xs font-semibold text-primary/70 border-b border-primary/20">
            <span>Дата</span><span className="text-right">Заработано</span><span className="text-right">% плана</span>
          </div>
          {monthReports.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Нет данных за этот месяц</p>
          ) : monthReports.map(r => (
            <div key={r.id} className="border-b border-primary/10 last:border-0">
              <button onClick={() => (r.locked || !isDateEditable(r.report_date))
                  ? setOpenDay(v => v === r.report_date ? null : r.report_date)
                  : openDayEdit(r)}
                className="w-full px-4 py-2.5 grid grid-cols-3 text-sm hover:bg-primary/3 transition-colors text-left">
                <span className="text-primary/70 flex items-center gap-1.5">
                  {new Date(r.report_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' })}
                  {(r.locked || !isDateEditable(r.report_date)) && <Icon name="Lock" size={11} className="text-muted-foreground" />}
                </span>
                <span className="text-right font-semibold text-primary">{fmtRub(r.total_rub)}</span>
                <span className="text-right font-semibold" style={{ color: OLIVE }}>
                  {plan && plan.daily_plan_rub > 0 ? Math.round(r.total_rub / plan.daily_plan_rub * 100) : '—'}%
                </span>
              </button>
              {openDay === r.report_date && (
                <div className="px-3 pb-2.5 bg-primary/3">
                  {(r.positions || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 px-1">Позиции не указаны</p>
                  ) : (r.positions || []).map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 md:gap-3 py-1.5 border-b border-primary/10 last:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-primary truncate">{p.staff_name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{CATEGORY_LABEL[p.category]}</div>
                      </div>
                      <span className="text-xs text-center w-12 md:w-16 flex-shrink-0 text-primary">{p.qty} шт</span>
                      <span className="text-[11px] text-muted-foreground w-12 md:w-16 flex-shrink-0 text-center">{p.price.toLocaleString('ru-RU')} ₽</span>
                      <span className="text-xs font-semibold w-16 md:w-20 flex-shrink-0 text-right" style={{ color: OLIVE }}>{fmtRub(p.qty * p.price)}</span>
                    </div>
                  ))}
                </div>
              )}
              {(r.locked || !isDateEditable(r.report_date)) && onRequestEdit && (
                <div className="px-4 pb-2.5">
                  {reqFor === r.report_date ? (
                    <div className="space-y-2">
                      <textarea value={reqComment} onChange={e => setReqComment(e.target.value)} rows={2}
                        placeholder="Что именно нужно исправить? *"
                        className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500" />
                      <div className="flex gap-2">
                        <button onClick={() => { onRequestEdit(r.report_date, reqComment.trim()); setSentDates(p => [...p, r.report_date]); setReqFor(null); setReqComment(''); }}
                          disabled={!reqComment.trim()}
                          className="px-4 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold disabled:opacity-50">Отправить</button>
                        <button onClick={() => setReqFor(null)}
                          className="px-4 py-1.5 rounded-xl border border-primary/30 text-primary text-xs">Отмена</button>
                      </div>
                    </div>
                  ) : sentDates.includes(r.report_date) ? (
                    <span className="text-xs text-amber-600">Запрос отправлен</span>
                  ) : (
                    <button onClick={() => { setReqFor(r.report_date); setReqComment(''); }}
                      className="text-xs text-amber-700 border border-amber-300 rounded-xl px-3 py-1 hover:bg-amber-50">
                      Запросить редактирование
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-primary/30 rounded-2xl overflow-hidden">
          <div className="bg-primary/5 px-4 py-2 grid grid-cols-4 text-xs font-semibold text-primary/70 border-b border-primary/20">
            <span>Месяц</span><span className="text-right">Заработано</span><span className="text-right">% плана</span><span className="text-right">Премия</span>
          </div>
          {monthsList.map(([ym, sum]) => {
            const monthBonus = monthBonuses[ym] ?? bonusFor(sum, planMonthRub);
            return (
              <div key={ym} className="px-4 py-2.5 grid grid-cols-4 border-b border-primary/10 last:border-0 text-sm hover:bg-primary/3">
                <span className="text-primary">
                  <span className="md:hidden">
                    {fmtMonth(ym).split(' ')[0]}<br />{fmtMonth(ym).split(' ')[1]}
                  </span>
                  <span className="hidden md:inline">{fmtMonth(ym)}</span>
                </span>
                <span className="text-right font-semibold text-primary">{fmtRub(sum)}</span>
                <span className="text-right font-semibold" style={{ color: OLIVE }}>
                  {planMonthRub > 0 ? Math.round(sum / planMonthRub * 100) : '—'}%
                </span>
                <span className="text-right font-semibold text-primary">{monthBonus > 0 ? fmtRub(monthBonus) : '—'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StaffCabinetStatsTab;

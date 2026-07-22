import Icon from '@/components/ui/icon';
import { DayReport, Plan, bonusFor, fmtMonth, fmtRub, OLIVE } from './staffCabinetUtils';

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
  bonus: number;
  monthReports: DayReport[];
  monthsList: [string, number][];
  planMonthRub: number;
  openDayEdit: (r: DayReport) => void;
}

const StaffCabinetStatsTab = ({
  statsPeriod, setStatsPeriod, monthEarned, monthDays, weekEarned, weekReports,
  plan, planPct, remainingToPlan, bonus, monthReports, monthsList, planMonthRub, openDayEdit,
}: StaffCabinetStatsTabProps) => {
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
        {bonus > 0 && (
          <div className="bg-card border border-accent/40 rounded-2xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Премия</div>
            <div className="text-xl font-bold text-primary">{fmtRub(bonus)}</div>
            <div className="text-xs text-muted-foreground">{planPct >= 100 ? '10% за выполнение' : '5% за 80%+'}</div>
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
            <button key={r.id} onClick={() => openDayEdit(r)}
              className="w-full px-4 py-2.5 grid grid-cols-3 border-b border-primary/10 last:border-0 text-sm hover:bg-primary/3 transition-colors text-left">
              <span className="text-primary/70 flex items-center gap-1.5">
                {new Date(r.report_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' })}
                {r.locked && <Icon name="Lock" size={11} className="text-muted-foreground" />}
              </span>
              <span className="text-right font-semibold text-primary">{fmtRub(r.total_rub)}</span>
              <span className="text-right font-semibold" style={{ color: OLIVE }}>
                {plan && plan.daily_plan_rub > 0 ? Math.round(r.total_rub / plan.daily_plan_rub * 100) : '—'}%
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="border border-primary/30 rounded-2xl overflow-hidden">
          <div className="bg-primary/5 px-4 py-2 grid grid-cols-4 text-xs font-semibold text-primary/70 border-b border-primary/20">
            <span>Месяц</span><span className="text-right">Заработано</span><span className="text-right">% плана</span><span className="text-right">Премия</span>
          </div>
          {monthsList.map(([ym, sum]) => {
            const monthBonus = bonusFor(sum, planMonthRub);
            return (
              <div key={ym} className="px-4 py-2.5 grid grid-cols-4 border-b border-primary/10 last:border-0 text-sm hover:bg-primary/3">
                <span className="text-primary">{fmtMonth(ym)}</span>
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

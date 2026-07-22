import { VacationEntry, fmtMonth, fmtRub, OLIVE } from './staffCabinetUtils';

interface StaffCabinetVacationTabProps {
  vacation: { total: number; entries: VacationEntry[] };
}

const StaffCabinetVacationTab = ({ vacation }: StaffCabinetVacationTabProps) => {
  return (
    <div>
      <div className="bg-card border border-primary/30 rounded-2xl p-5 mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Накоплено отпускных</div>
          <div className="text-3xl font-bold text-primary">{fmtRub(vacation.total)}</div>
        </div>
        <div className="text-5xl">🏖️</div>
      </div>

      {vacation.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Начислений пока нет</p>
      ) : (
        <div className="border border-primary/30 rounded-2xl overflow-hidden">
          <div className="bg-primary/5 px-4 py-2 grid grid-cols-3 text-xs font-semibold text-primary/70 border-b border-primary/20">
            <span>Месяц</span><span className="text-right">Сумма</span><span>Комментарий</span>
          </div>
          {vacation.entries.map(e => (
            <div key={e.id} className="px-4 py-2.5 grid grid-cols-3 border-b border-primary/10 last:border-0 text-sm">
              <span className="text-primary">{fmtMonth(e.month)}</span>
              <span className="text-right font-semibold" style={{ color: OLIVE }}>{fmtRub(e.amount)}</span>
              <span className="text-primary/60 pl-2 text-xs truncate">{e.comment}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffCabinetVacationTab;

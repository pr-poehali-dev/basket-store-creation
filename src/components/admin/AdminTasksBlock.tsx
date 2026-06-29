import { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';

// ── Типы ──────────────────────────────────────────────────────────────────────
type TaskStatus   = 'pending' | 'in_progress' | 'done' | 'cancelled';
type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
type ReqType      = 'sick' | 'dayoff' | 'vacation' | 'data_fix';
type ReqStatus    = 'pending' | 'approved' | 'rejected';
type ViewMode     = 'list' | 'kanban' | 'calendar';
type TabKey       = 'my' | 'by_me' | 'all' | 'requests' | 'notifications';
type PeriodFilter = 'all' | 'overdue' | 'today' | 'week' | 'next_week' | 'future';

interface Task {
  id: number;
  title: string;
  description: string;
  assigned_to: number | null;
  assignee_name: string;
  assigned_by: number | null;
  assigned_by_name: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
}

interface TaskRequest {
  id: number;
  staff_id: number;
  staff_name: string;
  request_type: ReqType;
  comment: string;
  date_from: string;
  date_to: string;
  status: ReqStatus;
  reviewed_by: string;
  review_comment: string;
  created_at: string;
}

interface StaffOption {
  id: number;
  full_name: string;
  group_name: string;
  pages: string[];
  is_active: boolean;
}

export interface AuthData {
  is_admin: boolean;
  staff_id?: number;
  full_name?: string;
  pages: string[];
  role?: string;
}

// ── Константы ─────────────────────────────────────────────────────────────────
const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Низкий', normal: 'Обычный', high: 'Высокий', urgent: 'Срочно'
};
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-500',
  normal: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-50 text-orange-600',
  urgent: 'bg-red-50 text-red-600',
};
const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'Ожидает', in_progress: 'В работе', done: 'Выполнено', cancelled: 'Отменено'
};
const STATUS_COLOR: Record<TaskStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  done: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
};
const REQ_TYPE_LABEL: Record<ReqType, string> = {
  sick: 'Больничный', dayoff: 'Выходной', vacation: 'Отпуск', data_fix: 'Правка данных'
};
const REQ_STATUS_LABEL: Record<ReqStatus, string> = {
  pending: 'На рассмотрении', approved: 'Одобрено', rejected: 'Отклонено'
};
const KANBAN_COLS: TaskStatus[] = ['pending', 'in_progress', 'done'];
const OLIVE = '#6b7c3a';

// ── Утилиты ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

function isoToday(): string { return new Date().toISOString().slice(0,10); }

function getWeekRange(offsetWeeks = 0): [string, string] {
  const now = new Date();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const mon = new Date(now); mon.setDate(now.getDate() - dow + offsetWeeks * 7);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return [mon.toISOString().slice(0,10), sun.toISOString().slice(0,10)];
}

function matchesPeriod(task: Task, period: PeriodFilter): boolean {
  if (period === 'all') return true;
  const due = task.due_date;
  const today = isoToday();
  if (period === 'overdue') return !!due && due < today && task.status !== 'done';
  if (period === 'today')   return due === today;
  if (period === 'week') {
    const [mon, sun] = getWeekRange(0);
    return !!due && due >= mon && due <= sun;
  }
  if (period === 'next_week') {
    const [mon, sun] = getWeekRange(1);
    return !!due && due >= mon && due <= sun;
  }
  if (period === 'future') {
    const [,sun] = getWeekRange(1);
    return !!due && due > sun;
  }
  return true;
}

// ── Форма новой задачи ────────────────────────────────────────────────────────
const TaskForm = ({ auth, staff, onSave, onClose }: {
  auth: AuthData;
  staff: StaffOption[];
  onSave: (task: Partial<Task>) => Promise<void>;
  onClose: () => void;
}) => {
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [assignTo, setAssignTo] = useState<number | ''>('');
  const [dueDate, setDueDate]   = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [saving, setSaving]     = useState(false);

  // Только сотрудники с личным кабинетом
  const staffWithCabinet = staff.filter(s => (s.pages || []).includes('cabinet') && s.is_active);

  // Группируем по group_name
  const groups: Record<string, StaffOption[]> = {};
  for (const s of staffWithCabinet) {
    if (!groups[s.group_name]) groups[s.group_name] = [];
    groups[s.group_name].push(s);
  }

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: desc,
      assigned_to: assignTo !== '' ? Number(assignTo) : null,
      assigned_by: auth.staff_id || null,
      assigned_by_name: auth.full_name || 'Администратор',
      due_date: dueDate,
      priority,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-primary text-lg mb-4">Новая задача</h3>
        <div className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название задачи *"
            className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Описание (необязательно)" rows={2}
            className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent resize-none" />

          {/* Выбор по подразделениям */}
          <select value={assignTo} onChange={e => setAssignTo(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent">
            <option value="">— Кому (всем) —</option>
            {Object.entries(groups).map(([group, members]) => (
              <optgroup key={group} label={group}>
                {members.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </optgroup>
            ))}
          </select>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Дедлайн</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Приоритет</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent">
                {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={submit} disabled={saving || !title.trim()}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
            {saving ? 'Сохраняю...' : 'Создать'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
        </div>
      </div>
    </div>
  );
};

// ── Форма заявки ──────────────────────────────────────────────────────────────
const RequestForm = ({ auth, onSave, onClose }: {
  auth: AuthData;
  onSave: (req: Partial<TaskRequest>) => Promise<void>;
  onClose: () => void;
}) => {
  const [reqType, setReqType] = useState<ReqType>('dayoff');
  const [comment, setComment] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');
  const [saving, setSaving]   = useState(false);

  const submit = async () => {
    setSaving(true);
    await onSave({ staff_id: auth.staff_id, staff_name: auth.full_name || '', request_type: reqType, comment, date_from: dateFrom, date_to: dateTo });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-primary text-lg mb-4">Заявка</h3>
        <div className="space-y-3">
          <select value={reqType} onChange={e => setReqType(e.target.value as ReqType)}
            className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent">
            {(Object.keys(REQ_TYPE_LABEL) as ReqType[]).map(t => <option key={t} value={t}>{REQ_TYPE_LABEL[t]}</option>)}
          </select>
          {reqType !== 'data_fix' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1">С</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1">По</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent" />
              </div>
            </div>
          )}
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder={reqType === 'data_fix' ? 'Опиши что нужно исправить...' : 'Комментарий (необязательно)'}
            rows={3} className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent resize-none" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={submit} disabled={saving}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
            {saving ? 'Отправляю...' : 'Отправить заявку'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
        </div>
      </div>
    </div>
  );
};

// ── Одна карточка задачи ──────────────────────────────────────────────────────
const TaskCard = ({ task, onUpdateStatus, compact }: {
  task: Task;
  onUpdateStatus: (id: number, status: TaskStatus) => void;
  compact?: boolean;
}) => {
  const today = isoToday();
  const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
  return (
    <div className={`bg-card border rounded-2xl px-3 py-2.5 ${task.status === 'done' ? 'opacity-60' : ''} ${isOverdue ? 'border-red-300' : 'border-primary/25'}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[task.priority]}`}>
          {PRIORITY_LABEL[task.priority]}
        </span>
        {task.due_date && (
          <span className={`text-[10px] font-medium flex-shrink-0 ${isOverdue ? 'text-red-500 font-bold' : 'text-primary/60'}`}>
            {isOverdue ? '⚠️ ' : ''}{fmtDate(task.due_date)}
          </span>
        )}
      </div>
      <div className="font-semibold text-primary text-sm leading-tight mb-1">{task.title}</div>
      {task.description && !compact && (
        <p className="text-xs text-primary/60 mb-1 line-clamp-2">{task.description}</p>
      )}
      {/* Исполнитель и автор */}
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <div className="text-[10px] text-primary/50 leading-tight">
          <span className="text-primary/70">→ {task.assignee_name || 'Все'}</span>
        </div>
        <select value={task.status} onChange={e => onUpdateStatus(task.id, e.target.value as TaskStatus)}
          onClick={e => e.stopPropagation()}
          className="text-[10px] border border-primary/25 rounded-lg px-1.5 py-0.5 bg-background outline-none text-primary flex-shrink-0 max-w-[100px]">
          {(Object.keys(STATUS_LABEL) as TaskStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

// ── Канбан ────────────────────────────────────────────────────────────────────
const KanbanView = ({ tasks, onUpdateStatus }: { tasks: Task[]; onUpdateStatus: (id: number, status: TaskStatus) => void }) => (
  <div className="flex gap-4 min-w-max pb-2">
    {KANBAN_COLS.map(col => {
      const colTasks = tasks.filter(t => t.status === col);
      return (
        <div key={col} className="w-72 flex-shrink-0">
          <div className={`px-3 py-2 mb-3 rounded-xl border text-sm font-semibold text-center ${STATUS_COLOR[col]}`}>
            {STATUS_LABEL[col]} ({colTasks.length})
          </div>
          <div className="space-y-2">
            {colTasks.map(t => <TaskCard key={t.id} task={t} onUpdateStatus={onUpdateStatus} />)}
            {colTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Нет задач</p>}
          </div>
        </div>
      );
    })}
  </div>
);

// ── Список ────────────────────────────────────────────────────────────────────
const ListView = ({ tasks, onUpdateStatus }: { tasks: Task[]; onUpdateStatus: (id: number, status: TaskStatus) => void }) => (
  <div className="border border-primary/20 rounded-2xl overflow-hidden">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-primary/5 text-xs text-primary/60 border-b border-primary/15">
          <th className="px-3 py-2.5 text-left font-semibold">Задача</th>
          <th className="px-3 py-2.5 text-left font-semibold">Дедлайн</th>
          <th className="px-3 py-2.5 text-left font-semibold">Исполнитель</th>
          <th className="px-3 py-2.5 text-left font-semibold">Автор</th>
          <th className="px-3 py-2.5 text-left font-semibold">Статус</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map(t => {
          const today = isoToday();
          const isOverdue = t.due_date && t.due_date < today && t.status !== 'done';
          return (
            <tr key={t.id} className={`border-b border-primary/10 last:border-0 hover:bg-primary/3 ${t.status === 'done' ? 'opacity-60' : ''}`}>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${PRIORITY_COLOR[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                  <span className="font-medium text-primary text-sm">{t.title}</span>
                </div>
                {t.description && <p className="text-xs text-primary/50 mt-0.5 line-clamp-1">{t.description}</p>}
              </td>
              <td className={`px-3 py-2 text-xs font-medium ${isOverdue ? 'text-red-500 font-bold' : 'text-primary/70'}`}>
                {isOverdue ? '⚠️ ' : ''}{t.due_date ? fmtDate(t.due_date) : '—'}
              </td>
              <td className="px-3 py-2 text-xs text-primary/70">{t.assignee_name || 'Все'}</td>
              <td className="px-3 py-2 text-xs text-primary/50">{t.assigned_by_name}</td>
              <td className="px-3 py-2">
                <select value={t.status} onChange={e => onUpdateStatus(t.id, e.target.value as TaskStatus)}
                  className="text-[10px] border border-primary/25 rounded-lg px-1.5 py-0.5 bg-background outline-none text-primary">
                  {(Object.keys(STATUS_LABEL) as TaskStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </td>
            </tr>
          );
        })}
        {tasks.length === 0 && (
          <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground text-sm">Нет задач</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

// ── Мини-календарь задач ──────────────────────────────────────────────────────
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

const CalendarView = ({ tasks, onUpdateStatus }: { tasks: Task[]; onUpdateStatus: (id: number, status: TaskStatus) => void }) => {
  const [currentMonth, setCurrentMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const today = new Date(); today.setHours(0,0,0,0);
  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let startWd = firstDay.getDay(); startWd = startWd === 0 ? 6 : startWd - 1;
  const gridDays: (Date|null)[] = Array(startWd).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) gridDays.push(new Date(year, month, d));
  while (gridDays.length % 7 !== 0) gridDays.push(null);
  const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const [selected, setSelected] = useState<Date|null>(null);
  const selectedTasks = selected ? tasks.filter(t => t.due_date === selected.toISOString().slice(0,10)) : [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth()-1); setCurrentMonth(d); }} className="px-2 py-1 rounded-lg border border-primary/30 text-primary hover:border-primary text-sm">←</button>
        <span className="font-semibold text-primary capitalize">{currentMonth.toLocaleString('ru-RU',{month:'long',year:'numeric'})}</span>
        <button onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth()+1); setCurrentMonth(d); }} className="px-2 py-1 rounded-lg border border-primary/30 text-primary hover:border-primary text-sm">→</button>
      </div>
      <div className="border border-primary/20 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 bg-primary/5 border-b border-primary/15">
          {WEEKDAYS.map(wd => <div key={wd} className="text-center text-xs font-semibold text-primary/60 py-2">{wd}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {gridDays.map((d, i) => {
            if (!d) return <div key={i} className="min-h-[80px] border-r border-b border-primary/10 bg-primary/2" />;
            const iso = d.toISOString().slice(0,10);
            const dayTasks = tasks.filter(t => t.due_date === iso);
            const isToday  = d.getTime() === today.getTime();
            const isSelected = selected?.toISOString().slice(0,10) === iso;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div key={i} onClick={() => setSelected(isSelected ? null : d)}
                className={`min-h-[80px] border-r border-b border-primary/10 p-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-accent/15' : isToday ? 'bg-accent/8' : isWeekend ? 'bg-primary/2' : 'bg-background'} hover:bg-primary/5`}>
                <div className={`text-xs font-bold mb-1 ${isToday ? 'text-accent' : isWeekend ? 'text-primary/40' : 'text-primary/70'}`}>{d.getDate()}</div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0,3).map(t => (
                    <div key={t.id} className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${PRIORITY_COLOR[t.priority]}`}>{t.title}</div>
                  ))}
                  {dayTasks.length > 3 && <div className="text-[9px] text-primary/50">+{dayTasks.length-3}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedTasks.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-sm font-semibold text-primary">{selected!.toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}</div>
          {selectedTasks.map(t => <TaskCard key={t.id} task={t} onUpdateStatus={onUpdateStatus} />)}
        </div>
      )}
    </div>
  );
};

// ── Основной блок задач ───────────────────────────────────────────────────────
const AdminTasksBlock = ({ auth, fullPage }: { auth: AuthData; fullPage?: boolean }) => {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [requests, setRequests] = useState<TaskRequest[]>([]);
  const [staff, setStaff]       = useState<StaffOption[]>([]);
  const [tab, setTab]           = useState<TabKey>('my');
  const [view, setView]         = useState<ViewMode>('list');
  const [staffFilter, setStaffFilter] = useState<number | ''>('');
  const [showDone, setShowDone] = useState(false);
  const [period, setPeriod]     = useState<PeriodFilter>('all');
  const [showTaskForm, setShowTaskForm]   = useState(false);
  const [showReqForm, setShowReqForm]     = useState(false);
  const [reviewId, setReviewId]           = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [collapsed, setCollapsed] = useState(true); // для мини-блока сверху

  const isAdmin   = auth.is_admin;
  const isManager = !isAdmin && auth.pages?.includes('access');
  const isEmployee = !isAdmin && !isManager;
  const canCreateTask = isAdmin || isManager;
  const canApprove    = isAdmin || isManager;

  const load = useCallback(async () => {
    try {
      const taskUrl = isEmployee && auth.staff_id ? `${urls['tasks']}?staff_id=${auth.staff_id}` : urls['tasks'];
      const [taskRes, reqRes, staffRes] = await Promise.all([
        fetch(taskUrl),
        fetch(`${urls['tasks']}?type=requests${isEmployee && auth.staff_id ? `&staff_id=${auth.staff_id}` : ''}`),
        fetch(urls['staff']),
      ]);
      const [taskData, reqData, staffData] = await Promise.all([taskRes.json(), reqRes.json(), staffRes.json()]);
      setTasks(taskData.tasks || []);
      setRequests(reqData.requests || []);
      setStaff((staffData.staff || []).filter((s: StaffOption) => s.is_active));
    } catch { /* сеть недоступна */ }
  }, [auth.staff_id, isEmployee]);

  useEffect(() => { load(); }, [load]);

  const createTask = async (task: Partial<Task>) => {
    await fetch(urls['tasks'], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'task', ...task }) });
    await load();
  };
  const createRequest = async (req: Partial<TaskRequest>) => {
    await fetch(urls['tasks'], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request', ...req }) });
    await load();
  };
  const updateTaskStatus = async (id: number, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    await fetch(urls['tasks'], { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'task', id, status }) });
  };
  const reviewRequest = async (id: number, status: 'approved' | 'rejected') => {
    await fetch(urls['tasks'], { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'request', id, status, reviewed_by: auth.full_name || 'Администратор', review_comment: reviewComment }) });
    setReviewId(null); setReviewComment(''); await load();
  };

  // Базовые фильтрации по вкладкам
  const myTasks    = tasks.filter(t => t.assigned_to === auth.staff_id);
  const byMeTasks  = tasks.filter(t => t.assigned_by === auth.staff_id && t.assigned_to !== auth.staff_id);
  const allTasks   = tasks;
  const pendingReqs = requests.filter(r => r.status === 'pending');

  // Статистика для мини-блока
  const today = isoToday();
  const todayTasks   = tasks.filter(t => t.due_date === today && t.status !== 'done');
  const doneTodayTasks = tasks.filter(t => t.due_date === today && t.status === 'done');
  const overdueTasks  = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done');

  const getBaseTasks = () => {
    if (tab === 'my') return myTasks;
    if (tab === 'by_me') return byMeTasks;
    return allTasks;
  };

  // Применяем фильтры
  const filteredTasks = useMemo(() => {
    let list = getBaseTasks();
    if (staffFilter !== '') list = list.filter(t => t.assigned_to === staffFilter || t.assigned_by === staffFilter);
    if (!showDone) list = list.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    if (period !== 'all') list = list.filter(t => matchesPeriod(t, period));
    return list;
  }, [tasks, tab, staffFilter, showDone, period, auth.staff_id]);

  // ── Мини-блок (сверху страниц, только свёрнутый) ──────────────────────────
  if (!fullPage) {
    const unreadCount = myTasks.filter(t => t.status === 'pending').length + pendingReqs.length;
    return (
      <div className="border-b-2 border-[#8a9a5a]/40 bg-[#f5f7f0]/60">
        <div className="px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#5a6a2a]">
              <Icon name="CheckSquare" size={15} />
              <span>Задачи</span>
              {unreadCount > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            {/* Статистика */}
            <div className="flex items-center gap-3 text-xs text-[#5a6a2a]/80">
              {todayTasks.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                  На сегодня: <b>{todayTasks.length}</b>
                </span>
              )}
              {doneTodayTasks.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Выполнено: <b>{doneTodayTasks.length}</b>
                </span>
              )}
              {overdueTasks.length > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  Просрочено: <b>{overdueTasks.length}</b>
                </span>
              )}
            </div>
          </div>
          {/* Быстрые действия */}
          <div className="flex items-center gap-2">
            {canCreateTask && (
              <button onClick={() => setShowTaskForm(true)}
                className="text-xs px-3 py-1.5 rounded-xl bg-[#8a9a5a]/20 text-[#5a6a2a] hover:bg-[#8a9a5a]/30 border border-[#8a9a5a]/30 transition-colors font-medium">
                + Задача
              </button>
            )}
            {isEmployee && (
              <button onClick={() => setShowReqForm(true)}
                className="text-xs px-3 py-1.5 rounded-xl bg-[#8a9a5a]/10 text-[#5a6a2a] hover:bg-[#8a9a5a]/20 border border-[#8a9a5a]/25 transition-colors">
                Заявка
              </button>
            )}
          </div>
        </div>
        {showTaskForm && <TaskForm auth={auth} staff={staff} onSave={createTask} onClose={() => setShowTaskForm(false)} />}
        {showReqForm && <RequestForm auth={auth} onSave={createRequest} onClose={() => setShowReqForm(false)} />}
      </div>
    );
  }

  // ── Полная страница задач ──────────────────────────────────────────────────
  const TABS: { key: TabKey; label: string; count?: number; adminOnly?: boolean }[] = [
    { key: 'my',            label: 'Мои задачи',       count: myTasks.filter(t=>t.status!=='done'&&t.status!=='cancelled').length },
    { key: 'by_me',         label: 'Я поставил',       count: byMeTasks.filter(t=>t.status!=='done'&&t.status!=='cancelled').length },
    { key: 'all',           label: 'Все задачи',       count: allTasks.filter(t=>t.status!=='done'&&t.status!=='cancelled').length, adminOnly: true },
    { key: 'requests',      label: 'Заявки',           count: pendingReqs.length },
    { key: 'notifications', label: 'Уведомления' },
  ];

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin || isManager);

  const PERIODS: { key: PeriodFilter; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'overdue', label: '🔴 Просроченные' },
    { key: 'today', label: 'Сегодня' },
    { key: 'week', label: 'Эта неделя' },
    { key: 'next_week', label: 'Следующая неделя' },
    { key: 'future', label: 'Будущее' },
  ];

  return (
    <div>
      {/* Заголовок + кнопки действий */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-display text-2xl font-semibold text-primary">Задачи</h1>
        <div className="flex gap-2">
          {canCreateTask && (
            <button onClick={() => setShowTaskForm(true)}
              className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors">
              + Задача
            </button>
          )}
          {isEmployee && (
            <button onClick={() => setShowReqForm(true)}
              className="px-4 py-2 rounded-xl border border-primary/40 text-primary text-sm hover:border-primary transition-colors">
              + Заявка
            </button>
          )}
        </div>
      </div>

      {/* Статистика */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="bg-card border border-primary/25 rounded-2xl px-4 py-2.5">
          <div className="text-xs text-muted-foreground">Задач на сегодня</div>
          <div className="text-xl font-bold text-primary">{todayTasks.length}</div>
        </div>
        <div className="bg-card border border-green-200 rounded-2xl px-4 py-2.5">
          <div className="text-xs text-muted-foreground">Выполнено сегодня</div>
          <div className="text-xl font-bold text-green-600">{doneTodayTasks.length}</div>
        </div>
        <div className="bg-card border border-red-200 rounded-2xl px-4 py-2.5">
          <div className="text-xs text-muted-foreground">Просроченных</div>
          <div className="text-xl font-bold text-red-500">{overdueTasks.length}</div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1.5 mb-4 flex-wrap border-b border-primary/15 pb-3">
        {visibleTabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors relative ${tab === t.key ? 'bg-primary text-white border-primary' : 'border-primary/30 text-primary hover:border-primary'}`}>
            {t.label}
            {(t.count ?? 0) > 0 && (
              <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/30 text-white' : 'bg-primary/10 text-primary'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Фильтры (для всех вкладок кроме "мои") */}
      {tab !== 'my' && tab !== 'requests' && tab !== 'notifications' && (
        <div className="flex gap-3 mb-4 flex-wrap items-center">
          {/* Фильтр по сотруднику */}
          <select value={staffFilter} onChange={e => setStaffFilter(e.target.value === '' ? '' : Number(e.target.value))}
            className="border border-primary/30 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-accent">
            <option value="">Все сотрудники</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>

          {/* Тумблер выполненных */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div onClick={() => setShowDone(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative ${showDone ? 'bg-accent' : 'bg-primary/20'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showDone ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-primary">Выполненные</span>
          </label>

          {/* Периоды */}
          <div className="flex gap-1.5 flex-wrap">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${period === p.key ? 'bg-primary text-white border-primary' : 'border-primary/25 text-primary/70 hover:border-primary hover:text-primary'}`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Вид */}
          <div className="flex gap-1 ml-auto">
            {([['list','List'],['kanban','Columns'],['calendar','CalendarDays']] as const).map(([v, icon]) => (
              <button key={v} onClick={() => setView(v as ViewMode)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${view === v ? 'bg-primary text-white border-primary' : 'border-primary/25 text-primary/60 hover:border-primary hover:text-primary'}`}>
                <Icon name={icon} size={14} />
              </button>
            ))}
          </div>
        </div>
      )}
      {tab === 'my' && (
        <div className="flex gap-1 mb-4 ml-auto justify-end">
          {([['list','List'],['kanban','Columns'],['calendar','CalendarDays']] as const).map(([v, icon]) => (
            <button key={v} onClick={() => setView(v as ViewMode)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${view === v ? 'bg-primary text-white border-primary' : 'border-primary/25 text-primary/60 hover:border-primary hover:text-primary'}`}>
              <Icon name={icon} size={14} />
            </button>
          ))}
        </div>
      )}

      {/* Контент */}
      {tab === 'requests' ? (
        <div className="space-y-2">
          {requests.length === 0 ? <p className="text-muted-foreground">Заявок нет</p> : requests.map(req => (
            <div key={req.id} className="bg-card border border-primary/25 rounded-2xl px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-primary">{REQ_TYPE_LABEL[req.request_type]}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${req.status==='pending'?'bg-yellow-50 text-yellow-700':req.status==='approved'?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>
                      {REQ_STATUS_LABEL[req.status]}
                    </span>
                  </div>
                  {(isAdmin||isManager) && <div className="text-sm text-primary/70 mb-1">{req.staff_name}</div>}
                  {(req.date_from||req.date_to) && <div className="text-sm text-primary mb-0.5">{req.date_from&&fmtDate(req.date_from)}{req.date_to&&req.date_to!==req.date_from&&` — ${fmtDate(req.date_to)}`}</div>}
                  {req.comment && <p className="text-sm text-primary/60">{req.comment}</p>}
                  {req.review_comment && <p className="text-xs text-primary/40 italic mt-1">{req.reviewed_by}: {req.review_comment}</p>}
                </div>
                {canApprove && req.status==='pending' && (
                  reviewId===req.id ? (
                    <div className="space-y-1 flex-shrink-0 w-44">
                      <input value={reviewComment} onChange={e=>setReviewComment(e.target.value)} placeholder="Комментарий"
                        className="w-full text-xs border border-primary/25 rounded-lg px-2 py-1 outline-none"/>
                      <div className="flex gap-1">
                        <button onClick={()=>reviewRequest(req.id,'approved')} className="flex-1 text-xs bg-green-500 text-white rounded-lg py-1">Одобрить</button>
                        <button onClick={()=>reviewRequest(req.id,'rejected')} className="flex-1 text-xs bg-red-400 text-white rounded-lg py-1">Отклонить</button>
                        <button onClick={()=>setReviewId(null)} className="text-xs text-primary/50 px-1">✕</button>
                      </div>
                    </div>
                  ) : <button onClick={()=>setReviewId(req.id)} className="text-sm text-primary/60 hover:text-primary underline flex-shrink-0">Рассмотреть →</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'notifications' ? (
        <div className="text-muted-foreground py-4">Уведомления появятся здесь при изменении сроков задач.</div>
      ) : (
        <>
          {view === 'list'     && <ListView     tasks={filteredTasks} onUpdateStatus={updateTaskStatus} />}
          {view === 'kanban'   && <KanbanView   tasks={filteredTasks} onUpdateStatus={updateTaskStatus} />}
          {view === 'calendar' && <CalendarView tasks={filteredTasks} onUpdateStatus={updateTaskStatus} />}
        </>
      )}

      {showTaskForm && <TaskForm auth={auth} staff={staff} onSave={createTask} onClose={() => setShowTaskForm(false)} />}
      {showReqForm  && <RequestForm auth={auth} onSave={createRequest} onClose={() => setShowReqForm(false)} />}
    </div>
  );
};

export default AdminTasksBlock;

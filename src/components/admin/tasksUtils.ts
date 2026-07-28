// ── Типы ──────────────────────────────────────────────────────────────────────
export type TaskStatus   = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type ReqType      = 'sick' | 'dayoff' | 'vacation' | 'data_fix';
export type ReqStatus    = 'pending' | 'approved' | 'rejected';
export type ViewMode     = 'list' | 'kanban' | 'calendar';
export type TabKey       = 'tasks' | 'requests' | 'notifications';
export type TaskSubTab   = 'my' | 'by_me' | 'all';
export type PeriodFilter = 'all' | 'overdue' | 'today' | 'week' | 'next_week' | 'future';

export interface Task {
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
  order_id: number | null;
  order_number: string;
  order_city: string;
  order_customer_name: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  author_staff_id: number | null;
  author_name: string;
  comment: string;
  attachment_url: string;
  attachment_name: string;
  created_at: string;
}

export interface TaskRequest {
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

export interface StaffOption {
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
export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Низкий', normal: 'Обычный', high: 'Высокий', urgent: 'Срочно'
};
export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-500',
  normal: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-50 text-orange-600',
  urgent: 'bg-red-50 text-red-600',
};
export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'Ожидает', in_progress: 'В работе', done: 'Выполнено', cancelled: 'Отменено'
};
export const STATUS_COLOR: Record<TaskStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  done: 'bg-[#f0f4e8] text-[#5a6a2a] border-[#c8d8b0]',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
};
export const REQ_TYPE_LABEL: Record<ReqType, string> = {
  sick: 'Больничный', dayoff: 'Выходной', vacation: 'Отпуск', data_fix: 'Правка данных'
};
export const REQ_STATUS_LABEL: Record<ReqStatus, string> = {
  pending: 'На рассмотрении', approved: 'Одобрено', rejected: 'Отклонено'
};
export const KANBAN_COLS: TaskStatus[] = ['pending', 'in_progress', 'done'];
export const OLIVE = '#6b7c3a';

// Автосозданные задачи "проставления сроков" — сопоставление префикса заголовка
// с полем даты в заказе, которое нужно проставить прямо из задачи.
export const DUE_FIELD_BY_PREFIX: { prefix: string; field: 'due_date' | 'due_weaving' | 'due_painting'; label: string }[] = [
  { prefix: 'Срок готовности:', field: 'due_date',     label: 'Дата готовности' },
  { prefix: 'Срок плетения:',   field: 'due_weaving',  label: 'Срок плетения' },
  { prefix: 'Срок окраски:',    field: 'due_painting', label: 'Срок окраски' },
];

export function getDueFieldForTask(title: string): { field: 'due_date' | 'due_weaving' | 'due_painting'; label: string } | null {
  const found = DUE_FIELD_BY_PREFIX.find(m => title.startsWith(m.prefix));
  return found ? { field: found.field, label: found.label } : null;
}

// ── Утилиты ───────────────────────────────────────────────────────────────────
export function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

export function isoToday(): string { return new Date().toISOString().slice(0,10); }

export function getWeekRange(offsetWeeks = 0): [string, string] {
  const now = new Date();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const mon = new Date(now); mon.setDate(now.getDate() - dow + offsetWeeks * 7);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return [mon.toISOString().slice(0,10), sun.toISOString().slice(0,10)];
}

export function matchesPeriod(task: Task, period: PeriodFilter): boolean {
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
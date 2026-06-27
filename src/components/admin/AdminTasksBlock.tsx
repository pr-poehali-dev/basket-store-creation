import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';

// Типы
type TaskStatus   = 'pending' | 'in_progress' | 'done' | 'cancelled';
type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
type ReqType      = 'sick' | 'dayoff' | 'vacation' | 'data_fix';
type ReqStatus    = 'pending' | 'approved' | 'rejected';

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
}

interface AuthData {
  is_admin: boolean;
  staff_id?: number;
  full_name?: string;
  pages: string[];
  role?: string;
}

// Цвет блока — тёплый пыльный синий
const BLOCK_BG = 'bg-[#e8edf5]';
const BLOCK_BORDER = 'border-[#b8c4d8]';

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
const REQ_TYPE_LABEL: Record<ReqType, string> = {
  sick: 'Больничный', dayoff: 'Выходной', vacation: 'Отпуск', data_fix: 'Правка данных'
};
const REQ_STATUS_LABEL: Record<ReqStatus, string> = {
  pending: 'На рассмотрении', approved: 'Одобрено', rejected: 'Отклонено'
};

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
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
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Название задачи *"
            className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Описание (необязательно)"
            rows={2}
            className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent resize-none"
          />
          <select
            value={assignTo} onChange={e => setAssignTo(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">— Кому (все / мне) —</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="flex-1 border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <select
              value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}
              className="flex-1 border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map(p => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={submit} disabled={saving || !title.trim()}
            className="flex-1 bg-[#4a6fa5] hover:bg-[#3d5d8c] text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
            {saving ? 'Сохраняю...' : 'Создать'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
        </div>
      </div>
    </div>
  );
};

// ── Форма заявки (для сотрудника) ────────────────────────────────────────────
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
    await onSave({
      staff_id: auth.staff_id,
      staff_name: auth.full_name || '',
      request_type: reqType,
      comment,
      date_from: dateFrom,
      date_to: dateTo,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl border border-primary/30 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-primary text-lg mb-4">Заявка</h3>
        <div className="space-y-3">
          <select
            value={reqType} onChange={e => setReqType(e.target.value as ReqType)}
            className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {(Object.keys(REQ_TYPE_LABEL) as ReqType[]).map(t => (
              <option key={t} value={t}>{REQ_TYPE_LABEL[t]}</option>
            ))}
          </select>
          {(reqType !== 'data_fix') && (
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
          <textarea
            value={comment} onChange={e => setComment(e.target.value)}
            placeholder={reqType === 'data_fix' ? 'Опиши что нужно исправить...' : 'Комментарий (необязательно)'}
            rows={3}
            className="w-full border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent resize-none"
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={submit} disabled={saving}
            className="flex-1 bg-[#4a6fa5] hover:bg-[#3d5d8c] text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
            {saving ? 'Отправляю...' : 'Отправить заявку'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-primary/30 text-primary text-sm">Отмена</button>
        </div>
      </div>
    </div>
  );
};

// ── Основной блок задач ───────────────────────────────────────────────────────
const AdminTasksBlock = ({ auth }: { auth: AuthData }) => {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [requests, setRequests] = useState<TaskRequest[]>([]);
  const [staff, setStaff]       = useState<StaffOption[]>([]);
  const [tab, setTab]           = useState<'my' | 'all' | 'requests'>('my');
  const [collapsed, setCollapsed] = useState(false);
  const [showTaskForm, setShowTaskForm]   = useState(false);
  const [showReqForm, setShowReqForm]     = useState(false);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const isAdmin = auth.is_admin;
  // Руководитель — не сотрудник и не просто admin
  const isManager = !isAdmin && auth.pages?.includes('access');
  const isEmployee = !isAdmin && !isManager;

  const canCreateTask = isAdmin || isManager;
  const canApprove    = isAdmin || isManager;

  const load = useCallback(async () => {
    try {
      const taskUrl = isEmployee && auth.staff_id
        ? `${urls['tasks']}?staff_id=${auth.staff_id}`
        : urls['tasks'];
      const [taskRes, reqRes, staffRes] = await Promise.all([
        fetch(taskUrl),
        fetch(`${urls['tasks']}?type=requests${isEmployee && auth.staff_id ? `&staff_id=${auth.staff_id}` : ''}`),
        fetch(urls['staff']),
      ]);
      const [taskData, reqData, staffData] = await Promise.all([taskRes.json(), reqRes.json(), staffRes.json()]);
      setTasks(taskData.tasks || []);
      setRequests(reqData.requests || []);
      setStaff((staffData.staff || []).filter((s: { is_active: boolean }) => s.is_active));
    } catch { /* сеть недоступна */ }
  }, [auth.staff_id, isEmployee]);

  useEffect(() => { load(); }, [load]);

  const createTask = async (task: Partial<Task>) => {
    await fetch(urls['tasks'], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'task', ...task }),
    });
    await load();
  };

  const createRequest = async (req: Partial<TaskRequest>) => {
    await fetch(urls['tasks'], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request', ...req }),
    });
    await load();
  };

  const updateTaskStatus = async (id: number, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    await fetch(urls['tasks'], {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'task', id, status }),
    });
  };

  const reviewRequest = async (id: number, status: 'approved' | 'rejected') => {
    await fetch(urls['tasks'], {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'request', id, status, reviewed_by: auth.full_name || 'Администратор', review_comment: reviewComment }),
    });
    setReviewId(null);
    setReviewComment('');
    await load();
  };

  // Задачи для текущей вкладки
  const myTasks  = tasks.filter(t => t.assigned_to === auth.staff_id && t.status !== 'cancelled');
  const allTasks = tasks.filter(t => t.status !== 'cancelled');
  const pendingReqs = requests.filter(r => r.status === 'pending');

  const visibleTasks = tab === 'my' ? myTasks : tab === 'all' ? allTasks : [];
  const donePct = visibleTasks.length
    ? Math.round(visibleTasks.filter(t => t.status === 'done').length / visibleTasks.length * 100)
    : 0;

  return (
    <div className={`${BLOCK_BG} border-b ${BLOCK_BORDER}`}>
      {/* Шапка блока */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="flex items-center gap-2 font-semibold text-[#2d4a6e] text-sm"
          >
            <Icon name="CheckSquare" size={16} />
            <span>Задачи</span>
            {pendingReqs.length > 0 && canApprove && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#4a6fa5] text-white text-[10px] font-bold">
                {pendingReqs.length}
              </span>
            )}
            <Icon name={collapsed ? 'ChevronDown' : 'ChevronUp'} size={14} className="text-[#4a6fa5]" />
          </button>

          {!collapsed && (
            <div className="flex gap-1">
              <button
                onClick={() => setTab('my')}
                className={`text-xs px-3 py-1 rounded-lg transition-colors ${tab === 'my' ? 'bg-[#4a6fa5] text-white' : 'bg-white/60 text-[#2d4a6e] hover:bg-white'}`}
              >
                Мои задачи {myTasks.length > 0 && `(${myTasks.length})`}
              </button>
              {(isAdmin || isManager) && (
                <button
                  onClick={() => setTab('all')}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${tab === 'all' ? 'bg-[#4a6fa5] text-white' : 'bg-white/60 text-[#2d4a6e] hover:bg-white'}`}
                >
                  Все задачи {allTasks.length > 0 && `(${allTasks.length})`}
                </button>
              )}
              {(isAdmin || isManager) && (
                <button
                  onClick={() => setTab('requests')}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors relative ${tab === 'requests' ? 'bg-[#4a6fa5] text-white' : 'bg-white/60 text-[#2d4a6e] hover:bg-white'}`}
                >
                  Заявки
                  {pendingReqs.length > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">{pendingReqs.length}</span>
                  )}
                </button>
              )}
              {isEmployee && (
                <button
                  onClick={() => setTab('requests')}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${tab === 'requests' ? 'bg-[#4a6fa5] text-white' : 'bg-white/60 text-[#2d4a6e] hover:bg-white'}`}
                >
                  Мои заявки
                </button>
              )}
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="flex items-center gap-2">
            {/* Прогресс */}
            {tab !== 'requests' && visibleTasks.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-[#2d4a6e]">
                <div className="w-20 h-1.5 rounded-full bg-white/50">
                  <div className="h-full rounded-full bg-[#4a6fa5]" style={{ width: `${donePct}%` }} />
                </div>
                <span className="font-semibold">{donePct}%</span>
              </div>
            )}
            {/* Кнопки действий */}
            {canCreateTask && (
              <button
                onClick={() => setShowTaskForm(true)}
                className="text-xs px-3 py-1.5 rounded-xl bg-[#4a6fa5] text-white hover:bg-[#3d5d8c] transition-colors"
              >
                + Задача
              </button>
            )}
            {isEmployee && (
              <button
                onClick={() => setShowReqForm(true)}
                className="text-xs px-3 py-1.5 rounded-xl bg-white/70 border border-[#b8c4d8] text-[#2d4a6e] hover:bg-white transition-colors"
              >
                Заявка
              </button>
            )}
          </div>
        )}
      </div>

      {/* Контент */}
      {!collapsed && (
        <div className="px-6 pb-4">
          {/* ЗАДАЧИ */}
          {tab !== 'requests' && (
            visibleTasks.length === 0 ? (
              <p className="text-sm text-[#4a6fa5]/70 py-2">Задач нет</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {visibleTasks.map(task => (
                  <div
                    key={task.id}
                    className={`bg-white/80 border border-white rounded-2xl px-3 py-2 min-w-[200px] max-w-[280px] ${
                      task.status === 'done' ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[task.priority]}`}>
                        {PRIORITY_LABEL[task.priority]}
                      </span>
                      {task.due_date && (
                        <span className="text-[10px] text-[#4a6fa5]/70 flex-shrink-0">{fmtDate(task.due_date)}</span>
                      )}
                    </div>
                    <div className="font-semibold text-[#2d4a6e] text-sm leading-tight mb-1">{task.title}</div>
                    {task.description && (
                      <p className="text-xs text-[#4a6fa5]/80 mb-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-[#4a6fa5]/60">
                        {task.assignee_name || 'Все'}
                        {task.assigned_by_name && ` · от ${task.assigned_by_name}`}
                      </span>
                      <select
                        value={task.status}
                        onChange={e => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                        onClick={e => e.stopPropagation()}
                        className="text-[10px] border border-[#b8c4d8] rounded-lg px-1 py-0.5 bg-white outline-none text-[#2d4a6e]"
                      >
                        {(Object.keys(STATUS_LABEL) as TaskStatus[]).map(s => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ЗАЯВКИ */}
          {tab === 'requests' && (
            requests.length === 0 ? (
              <p className="text-sm text-[#4a6fa5]/70 py-2">Заявок нет</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {requests.map(req => (
                  <div key={req.id} className="bg-white/80 border border-white rounded-2xl px-3 py-2 min-w-[220px] max-w-[320px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[#2d4a6e] text-sm">{REQ_TYPE_LABEL[req.request_type]}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        req.status === 'pending' ? 'bg-yellow-50 text-yellow-700'
                        : req.status === 'approved' ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-600'
                      }`}>
                        {REQ_STATUS_LABEL[req.status]}
                      </span>
                    </div>
                    {(isAdmin || isManager) && (
                      <div className="text-xs text-[#4a6fa5]/70 mb-1">{req.staff_name}</div>
                    )}
                    {(req.date_from || req.date_to) && (
                      <div className="text-xs text-[#2d4a6e] mb-1">
                        {req.date_from && fmtDate(req.date_from)}{req.date_to && req.date_to !== req.date_from && ` — ${fmtDate(req.date_to)}`}
                      </div>
                    )}
                    {req.comment && <p className="text-xs text-[#4a6fa5]/80 mb-1 line-clamp-2">{req.comment}</p>}
                    {req.review_comment && (
                      <p className="text-xs text-[#2d4a6e]/60 italic">{req.reviewed_by}: {req.review_comment}</p>
                    )}

                    {/* Кнопки одобрения (для руководителей) */}
                    {canApprove && req.status === 'pending' && (
                      reviewId === req.id ? (
                        <div className="mt-2 space-y-1" onClick={e => e.stopPropagation()}>
                          <input
                            value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                            placeholder="Комментарий (необязательно)"
                            className="w-full text-xs border border-[#b8c4d8] rounded-lg px-2 py-1 outline-none"
                          />
                          <div className="flex gap-1">
                            <button onClick={() => reviewRequest(req.id, 'approved')}
                              className="flex-1 text-xs bg-green-500 text-white rounded-lg py-1 hover:bg-green-600">
                              Одобрить
                            </button>
                            <button onClick={() => reviewRequest(req.id, 'rejected')}
                              className="flex-1 text-xs bg-red-400 text-white rounded-lg py-1 hover:bg-red-500">
                              Отклонить
                            </button>
                            <button onClick={() => setReviewId(null)} className="text-xs text-[#4a6fa5] px-1">✕</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReviewId(req.id)}
                          className="mt-1.5 text-xs text-[#4a6fa5] hover:underline"
                        >
                          Рассмотреть →
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Модалки */}
      {showTaskForm && (
        <TaskForm auth={auth} staff={staff} onSave={createTask} onClose={() => setShowTaskForm(false)} />
      )}
      {showReqForm && (
        <RequestForm auth={auth} onSave={createRequest} onClose={() => setShowReqForm(false)} />
      )}
    </div>
  );
};

export default AdminTasksBlock;

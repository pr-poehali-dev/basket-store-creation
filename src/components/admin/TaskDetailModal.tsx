import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import urls from '../../../backend/func2url.json';
import {
  Task, TaskComment, TaskStatus, AuthData,
  PRIORITY_LABEL, PRIORITY_COLOR, STATUS_LABEL, fmtDate, getDueFieldForTask,
} from './tasksUtils';

interface TaskDetailModalProps {
  task: Task;
  auth: AuthData;
  onClose: () => void;
  onUpdateStatus: (id: number, status: TaskStatus) => void;
  onOpenOrder: (orderId: number) => void;
  onSetOrderDueDate: (orderId: number, field: 'due_date' | 'due_weaving' | 'due_painting', value: string) => Promise<void>;
}

const TaskDetailModal = ({ task, auth, onClose, onUpdateStatus, onOpenOrder, onSetOrderDueDate }: TaskDetailModalProps) => {
  const [comments, setComments]   = useState<TaskComment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string } | null>(null);

  const dueField = getDueFieldForTask(task.title);
  const [dueValue, setDueValue] = useState('');
  const [savingDue, setSavingDue] = useState(false);
  const [dueSaved, setDueSaved] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${urls['tasks']}?type=comments&task_id=${task.id}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [task.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ev.target?.result as ArrayBuffer)));
      const res  = await fetch(urls['upload-image'], {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: b64, ext, folder: 'task-attachments' }),
      });
      const data = await res.json();
      if (data.url) setPendingFile({ url: data.url, name: file.name });
      setUploading(false);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const submitComment = async () => {
    if (!newComment.trim() && !pendingFile) return;
    setSending(true);
    try {
      await fetch(urls['tasks'], {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment', task_id: task.id,
          author_staff_id: auth.staff_id || null,
          author_name: auth.full_name || 'Администратор',
          comment: newComment.trim(),
          attachment_url: pendingFile?.url || null,
          attachment_name: pendingFile?.name || null,
        }),
      });
      setNewComment('');
      setPendingFile(null);
      await loadComments();
    } catch { /* ignore */ }
    setSending(false);
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(url);

  const saveDue = async () => {
    if (!dueField || !task.order_id || !dueValue) return;
    setSavingDue(true);
    await onSetOrderDueDate(task.order_id, dueField.field, dueValue);
    setSavingDue(false);
    setDueSaved(true);
    setTimeout(() => setDueSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl border border-primary/30 w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Заголовок */}
        <div className="p-5 border-b border-primary/10">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-primary text-lg leading-tight">{task.title}</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-primary text-xl flex-shrink-0">✕</button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[task.priority]}`}>
              {PRIORITY_LABEL[task.priority]}
            </span>
            {task.due_date && (
              <span className="text-[10px] font-medium text-primary/60">{fmtDate(task.due_date)}</span>
            )}
            <select value={task.status} onChange={e => onUpdateStatus(task.id, e.target.value as TaskStatus)}
              className="text-[10px] border border-primary/25 rounded-lg px-1.5 py-0.5 bg-background outline-none text-primary ml-auto">
              {(Object.keys(STATUS_LABEL) as TaskStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          {task.description && <p className="text-sm text-primary/60 mt-2">{task.description}</p>}
          <div className="text-xs text-primary/40 mt-1">
            {task.assigned_by_name && <>Поставил: {task.assigned_by_name}</>}
            {task.assignee_name && <> · Исполнитель: {task.assignee_name}</>}
          </div>

          {/* Ссылка на заказ */}
          {task.order_id && (
            <button onClick={() => onOpenOrder(task.order_id!)}
              className="mt-3 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl bg-accent/15 text-primary border border-accent/30 hover:bg-accent/25 transition-colors">
              📦 {task.order_city} {task.order_customer_name} {task.order_number && `#${task.order_number}`}
              <Icon name="ExternalLink" size={12} />
            </button>
          )}

          {/* Инлайн простановка срока (для авто-задач "проставление сроков") */}
          {dueField && task.order_id && (
            <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
              <label className="text-xs font-semibold text-primary block mb-1.5">{dueField.label}</label>
              <div className="flex gap-2">
                <input type="date" value={dueValue} onChange={e => setDueValue(e.target.value)}
                  className="flex-1 border border-primary/30 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-accent bg-background" />
                <button onClick={saveDue} disabled={!dueValue || savingDue}
                  className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold disabled:opacity-50">
                  {savingDue ? '...' : dueSaved ? '✓' : 'Сохранить'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Комментарии */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <h4 className="text-xs font-bold text-primary/50 uppercase tracking-wider">Комментарии</h4>
          {loading ? (
            <p className="text-sm text-muted-foreground">Загружаю...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет комментариев</p>
          ) : comments.map(c => (
            <div key={c.id} className="bg-card border border-primary/15 rounded-xl px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-primary">{c.author_name || 'Сотрудник'}</span>
                <span className="text-[10px] text-primary/40">{fmtDate(c.created_at)}</span>
              </div>
              {c.comment && <p className="text-sm text-primary/80 whitespace-pre-wrap break-words">{c.comment}</p>}
              {c.attachment_url && (
                isImage(c.attachment_url) ? (
                  <a href={c.attachment_url} target="_blank" rel="noreferrer" className="block mt-2">
                    <img src={c.attachment_url} alt={c.attachment_name} className="max-h-40 rounded-lg border border-primary/15" />
                  </a>
                ) : (
                  <a href={c.attachment_url} target="_blank" rel="noreferrer"
                    className="mt-2 flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary underline w-fit">
                    <Icon name="Paperclip" size={12} /> {c.attachment_name || 'Файл'}
                  </a>
                )
              )}
            </div>
          ))}
        </div>

        {/* Форма комментария */}
        <div className="p-4 border-t border-primary/10 space-y-2">
          {pendingFile && (
            <div className="flex items-center justify-between gap-2 bg-primary/5 rounded-lg px-2 py-1.5 text-xs text-primary">
              <span className="flex items-center gap-1.5 truncate"><Icon name="Paperclip" size={12} /> {pendingFile.name}</span>
              <button onClick={() => setPendingFile(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                <Icon name="X" size={13} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Написать комментарий..." rows={2}
              className="flex-1 border border-primary/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent resize-none" />
            <div className="flex flex-col gap-1.5">
              <label className={`w-9 h-9 flex items-center justify-center rounded-lg border border-primary/30 text-primary hover:border-primary cursor-pointer transition-colors ${uploading ? 'opacity-50' : ''}`}>
                {uploading ? '⏳' : <Icon name="Paperclip" size={15} />}
                <input type="file" className="hidden" onChange={handleFile} disabled={uploading}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
              </label>
              <button onClick={submitComment} disabled={sending || (!newComment.trim() && !pendingFile)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground disabled:opacity-50">
                <Icon name="Send" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
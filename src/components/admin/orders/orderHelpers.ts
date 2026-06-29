import urls from '../../../../backend/func2url.json';
import { Order, STAGES, CLOSED_STAGE, fmtMoney } from '../orderUtils';

export type ViewMode = 'kanban' | 'list' | 'calendar' | 'gantt';

export function nextStage(current: string): string | null {
  const work = STAGES.filter(s => s !== CLOSED_STAGE);
  const idx = work.indexOf(current);
  if (idx === -1 || idx >= work.length - 1) return null;
  return work[idx + 1];
}

export async function createAutoTasks(order: Order, field: 'due_date' | 'due_weaving' | 'due_painting') {
  try {
    const res = await fetch(urls['staff']);
    const data = await res.json();
    const staff: { id: number; full_name: string; group_name: string; is_active: boolean }[] = data.staff || [];

    const map: Record<string, { group: string; title: string }> = {
      due_date:     { group: 'Администрация',                title: `Срок готовности: ${order.city} ${order.customer_name}` },
      due_weaving:  { group: 'Руководители отделов плетения', title: `Срок плетения: ${order.city} ${order.customer_name}` },
      due_painting: { group: 'Маляр',                        title: `Срок окраски: ${order.city} ${order.customer_name}` },
    };

    const cfg = map[field];
    const today = new Date().toISOString().slice(0, 10);
    const targets = staff.filter(s => s.group_name === cfg.group && s.is_active);

    // Загружаем существующие задачи чтобы найти совпадения и отметить как выполненные
    let existingTasks: { id: number; title: string; assigned_to: number; status: string }[] = [];
    try {
      const tr = await fetch(urls['tasks']);
      const td = await tr.json();
      existingTasks = td.tasks || [];
    } catch { /* ignore */ }

    for (const s of targets) {
      // Не создаём дубли — пропускаем если уже есть активная задача
      const existing = existingTasks.find(t =>
        t.title === cfg.title && t.assigned_to === s.id && t.status !== 'done' && t.status !== 'cancelled'
      );
      if (existing) continue;
      // Создаём задачу со статусом pending
      await fetch(urls['tasks'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'task',
          title: cfg.title,
          description: `Заказ #${order.order_number} · ${fmtMoney(order.total)}`,
          assigned_to: s.id,
          assigned_by_name: 'Система',
          priority: 'high',
          due_date: today,
        }),
      });
    }
  } catch { /* не критично */ }
}
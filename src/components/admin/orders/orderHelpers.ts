import { Order, STAGES, CLOSED_STAGE, needsPainting } from '../orderUtils';

export type ViewMode = 'kanban' | 'list' | 'calendar' | 'gantt';

// Следующий этап для заказа. Если у заказа нет цветных позиций (всё «натуральный»),
// этап «Малярка» пропускается — заказ идёт сразу из «Плетение» в «Упаковку».
// С последнего рабочего этапа («Доставка») заказ переводится в «Закрытые».
export function nextStage(order: Order): string | null {
  const work = STAGES.filter(s => s !== CLOSED_STAGE);
  const idx = work.indexOf(order.stage);
  if (idx === -1) return null;
  if (idx >= work.length - 1) return CLOSED_STAGE;
  const next = work[idx + 1];
  if (next === 'Малярка' && !needsPainting(order)) {
    return work[idx + 2] ?? CLOSED_STAGE;
  }
  return next;
}

// Примечание: автоматическое создание задач-уведомлений (новый заказ, назначение
// ответственного, сроки плетения/окраски, доставка АТИ) теперь выполняется на
// бэкенде — см. backend/orders/index.py (notify_* функции), срабатывает при любом
// изменении stage/responsible независимо от того, из какого раздела оно пришло.
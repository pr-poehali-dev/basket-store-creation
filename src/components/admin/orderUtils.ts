export const STAGES = ['Новый заказ', 'Согласование', 'Оплата', 'В очереди на плетение', 'Плетение',
  'Малярка', 'Упаковка', 'Доставка', 'Закрытые'];

export const QUEUE_INDEX     = STAGES.indexOf('В очереди на плетение');
export const WEAVING_INDEX   = STAGES.indexOf('Плетение');
export const PAINTING_INDEX  = STAGES.indexOf('Малярка');
export const PACKING_INDEX   = STAGES.indexOf('Упаковка');
export const CLOSED_STAGE    = 'Закрытые';

export interface OrderItem {
  name: string;
  size: string;
  color: string;
  qty: number;
}

export interface Order {
  id: number;
  order_number: string;
  stage: string;
  city: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  total: number;
  discount: number;
  items: OrderItem[];
  created_at: string | null;
  responsible: string;
  due_date: string;
  due_weaving: string;
  due_painting: string;
  delivery_type: string;
  delivery_address: string;
  payment_method: string;
  comment: string;
  notes: string;
  produced: Record<string, number>;
  painted: Record<string, number>;
  is_archived: boolean;
  is_trashed: boolean;
  form?: Record<string, string>;
}

export interface Position {
  key: string;
  title: string;
  total: number;
  colors: { color: string; qty: number }[];
}

export function groupPositions(items: OrderItem[]): Position[] {
  const map = new Map<string, Position>();
  for (const it of items) {
    const key = `${it.name}__${it.size}`;
    const title = it.size ? `${it.name} (${it.size})` : it.name;
    if (!map.has(key)) {
      map.set(key, { key, title, total: 0, colors: [] });
    }
    const pos = map.get(key)!;
    pos.total += it.qty;
    const existing = pos.colors.find(c => c.color === it.color);
    if (existing) existing.qty += it.qty;
    else pos.colors.push({ color: it.color || '—', qty: it.qty });
  }
  return Array.from(map.values());
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function fmtDueDate(due: string): string {
  if (!due) return '';
  const d = new Date(due + 'T00:00:00');
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function fmtDateShort(due: string): string {
  if (!due) return '';
  const d = new Date(due + 'T00:00:00');
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function fmtMoney(n: number): string {
  return n.toLocaleString('ru-RU') + ' руб';
}

export const RESPONSIBLES: { name: string; bg: string; text: string }[] = [
  { name: 'Валера',   bg: '#cfe3f0', text: '#2c5773' },
  { name: 'Кристина', bg: '#d4e8d0', text: '#3f6b3a' },
  { name: 'Таня',     bg: '#f0d6df', text: '#834759' },
];

export function responsibleStyle(name: string) {
  return RESPONSIBLES.find(r => r.name === name);
}

export const DELIVERY_TYPES: Record<string, string> = {
  'тк': 'ТК',
  'ати': 'АТИ',
  'смв': 'СМВ',
};

export const DELIVERY_LABELS: Record<string, string> = {
  'тк': 'Транспортная компания',
  'ати': 'Частный перевозчик до адреса',
  'смв': 'Самовывоз',
};

export function daysUntil(due: string): number | null {
  if (!due) return null;
  const d = new Date(due + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Статус дедлайна для карточки:
// 'burn-weaving'  — сегодня или просрочен дедлайн плетения, заказ ещё до Малярки
// 'burn-painting' — сегодня или просрочен дедлайн покраски, заказ ещё до Упаковки
// 'warn-weaving'  — 1 день до дедлайна плетения (до Малярки)
// 'warn-painting' — 1 день до дедлайна покраски (до Упаковки)
// null — всё в норме
export type DeadlineStatus =
  | 'burn-weaving'
  | 'burn-painting'
  | 'warn-weaving'
  | 'warn-painting'
  | null;

export function getDeadlineStatus(order: Order): DeadlineStatus {
  const stageIdx = STAGES.indexOf(order.stage);

  if (order.due_weaving && stageIdx >= QUEUE_INDEX && stageIdx < PAINTING_INDEX) {
    const left = daysUntil(order.due_weaving);
    if (left !== null && left <= 0) return 'burn-weaving';
    if (left !== null && left === 1) return 'warn-weaving';
  }

  if (order.due_painting && stageIdx >= QUEUE_INDEX && stageIdx < PACKING_INDEX) {
    const left = daysUntil(order.due_painting);
    if (left !== null && left <= 0) return 'burn-painting';
    if (left !== null && left === 1) return 'warn-painting';
  }

  return null;
}

// Процент плетения для заказа (из produced)
export function weavingPct(order: Order): number {
  const positions = groupPositions(order.items);
  const totalQty = positions.reduce((s, p) => s + p.total, 0);
  if (totalQty === 0) return 0;
  const totalDone = positions.reduce((s, p) =>
    s + Math.min((order.produced || {})[p.key] || 0, p.total), 0);
  return Math.round((totalDone / totalQty) * 100);
}

// Процент покраски (из painted по ключам позиций)
export function paintingPct(order: Order): number {
  const positions = groupPositions(order.items);
  const totalQty = positions.reduce((s, p) => s + p.total, 0);
  if (totalQty === 0) return 0;
  const totalPainted = positions.reduce((s, p) =>
    s + Math.min((order.painted || {})[p.key] || 0, p.total), 0);
  return Math.round((totalPainted / totalQty) * 100);
}

// Можно ли перейти на следующий этап (блокировка по 100%)
export function canAdvanceStage(order: Order, targetStage: string): { ok: boolean; reason?: string } {
  if (targetStage === 'Малярка') {
    const pct = weavingPct(order);
    if (pct < 100) return { ok: false, reason: `Плетение ${pct}% — нужно 100% для перехода в Малярку.` };
  }
  if (targetStage === 'Упаковка') {
    const pct = paintingPct(order);
    if (pct < 100) return { ok: false, reason: `Покраска ${pct}% — нужно 100% для перехода в Упаковку.` };
  }
  return { ok: true };
}
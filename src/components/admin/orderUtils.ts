export const STAGES = ['Новый заказ', 'Согласование', 'Оплата', 'Плетение',
  'Малярка', 'Упаковка', 'Доставка', 'Отправили'];

// Индекс этапа "Малярка" — до него действует индикатор сроков
export const PAINTING_INDEX = STAGES.indexOf('Малярка');

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
  total: number;
  items: OrderItem[];
  created_at: string | null;
  responsible: string;
  due_date: string;
  delivery_type: string;
  produced: Record<string, number>;
}

export interface Position {
  key: string;
  title: string;
  total: number;
  colors: { color: string; qty: number }[];
}

// Группировка: позиция = название + размер (цвета — варианты внутри)
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

export function fmtMoney(n: number): string {
  return n.toLocaleString('ru-RU') + ' руб';
}

// Ответственные и их пастельные цвета
export const RESPONSIBLES: { name: string; bg: string; text: string }[] = [
  { name: 'Валера',   bg: '#cfe3f0', text: '#2c5773' }, // нежно-голубой
  { name: 'Кристина', bg: '#d4e8d0', text: '#3f6b3a' }, // нежно-зелёный
  { name: 'Таня',     bg: '#f0d6df', text: '#834759' }, // нежно-розовый
];

export function responsibleStyle(name: string) {
  return RESPONSIBLES.find(r => r.name === name);
}

// Типы доставки
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

// За сколько дней до срока включается режим "горим"
export const BURN_DAYS = 2;

// Сколько дней осталось до due_date (может быть отрицательным)
export function daysUntil(due: string): number | null {
  if (!due) return null;
  const d = new Date(due + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Горим ли по срокам: до "Малярки" и осталось <= BURN_DAYS дней
export function isBurning(order: Order): boolean {
  if (!order.due_date) return false;
  const stageIdx = STAGES.indexOf(order.stage);
  if (stageIdx >= PAINTING_INDEX) return false;
  const left = daysUntil(order.due_date);
  return left !== null && left <= BURN_DAYS;
}

export function fmtDueDate(due: string): string {
  if (!due) return '';
  const d = new Date(due + 'T00:00:00');
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

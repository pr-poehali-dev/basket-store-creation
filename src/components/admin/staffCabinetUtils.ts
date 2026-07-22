export interface AuthData {
  is_admin: boolean;
  staff_id?: number;
  full_name?: string;
  pages: string[];
}

export function getAuthFromSession(): AuthData {
  try {
    const raw = sessionStorage.getItem('admin_auth');
    if (raw) return JSON.parse(raw) as AuthData;
  } catch { /* ignore */ }
  return { is_admin: false, pages: [] };
}

export type Category = 'whole' | 'whole_ears' | 'no_handle' | 'handle' | 'ears';
export const CATEGORY_KEYS: Category[] = ['whole', 'whole_ears', 'no_handle', 'handle', 'ears'];
export const CATEGORY_LABEL: Record<Category, string> = {
  whole: 'С ручкой', whole_ears: 'С ушами', no_handle: 'Без ручки', handle: 'Ручка', ears: 'Уши',
};

export interface Position {
  id: number;
  catalog_name: string;
  staff_name: string;
  weave_type: string;
  sort_order: number;
  price_whole: number;
  price_no_handle: number;
  price_handle: number;
  price_ears: number;
  price_whole_ears: number;
}

// Объединённая позиция — если в справочнике 2 строки с одинаковым «Название для ЗП»
// (одна с ценой за ручку, другая с ценой за уши — по сути одна и та же корзина),
// они схлопываются в одну карточку. У «ручечного» и «ушастого» вариантов может
// быть РАЗНОЕ название в каталоге — поэтому храним оба, чтобы списание склада
// шло на правильный товар.
export interface MergedPosition {
  id: number;
  catalog_name: string;
  catalog_name_ears: string;
  staff_name: string;
  weave_type: string;
  sort_order: number;
  price_whole: number;
  price_no_handle: number;
  price_handle: number;
  price_ears: number;
  price_whole_ears: number;
}

export function categoryPrice(row: MergedPosition, cat: Category): number {
  switch (cat) {
    case 'whole': return row.price_whole;
    case 'whole_ears': return row.price_whole_ears;
    case 'no_handle': return row.price_no_handle;
    case 'handle': return row.price_handle;
    case 'ears': return row.price_ears;
  }
}

export function categoryCatalog(row: MergedPosition, cat: Category): string {
  return (cat === 'ears' || cat === 'whole_ears') ? row.catalog_name_ears : row.catalog_name;
}

// Схлопываем дубли по staff_name в одну карточку для личного кабинета
export function mergePositions(rows: Position[]): MergedPosition[] {
  const groups = new Map<string, Position[]>();
  for (const r of rows) {
    if (!groups.has(r.staff_name)) groups.set(r.staff_name, []);
    groups.get(r.staff_name)!.push(r);
  }
  const result: MergedPosition[] = [];
  for (const [staffName, group] of groups) {
    if (group.length === 1) {
      const r = group[0];
      result.push({
        id: r.id, catalog_name: r.catalog_name, catalog_name_ears: r.catalog_name,
        staff_name: r.staff_name, weave_type: r.weave_type, sort_order: r.sort_order,
        price_whole: r.price_whole, price_no_handle: r.price_no_handle,
        price_handle: r.price_handle, price_ears: r.price_ears, price_whole_ears: r.price_whole_ears,
      });
      continue;
    }
    const mainRow = group.find(r => r.price_handle > 0) || group[0];
    const earsRow = group.find(r => r.price_ears > 0 || r.price_whole_ears > 0) || group[group.length - 1];
    result.push({
      id: mainRow.id,
      catalog_name: mainRow.catalog_name,
      catalog_name_ears: earsRow.catalog_name,
      staff_name: staffName,
      weave_type: mainRow.weave_type || earsRow.weave_type,
      sort_order: mainRow.sort_order,
      price_whole: Math.max(...group.map(r => r.price_whole)),
      price_no_handle: Math.max(...group.map(r => r.price_no_handle)),
      price_handle: mainRow.price_handle,
      price_ears: earsRow.price_ears,
      price_whole_ears: earsRow.price_whole_ears,
    });
  }
  return result;
}

export interface ReportPosition {
  position_id: number;
  staff_name: string;
  catalog_name: string;
  weave_type: string;
  category: Category;
  price: number;
  qty: number;
}

export interface DayReport {
  id?: number;
  report_date: string;
  positions: ReportPosition[];
  total_rub: number;
  hours: number;
  time_start?: string;
  time_end?: string;
  locked: boolean;
}

export interface Plan {
  daily_plan_rub: number;
  daily_plan_hours: number;
}

export interface VacationEntry {
  id: number;
  month: string;
  amount: number;
  comment: string;
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtRub(n: number): string {
  return Math.round(n).toLocaleString('ru-RU') + ' ₽';
}

export function fmtMonth(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return `${months[parseInt(m)]} ${y}`;
}

export function bonusFor(sum: number, planMonthRub: number): number {
  if (planMonthRub <= 0) return 0;
  const pct = sum / planMonthRub * 100;
  if (pct >= 100) return sum * 0.1;
  if (pct >= 80) return sum * 0.05;
  return 0;
}

// Часы между временем начала и окончания (учитывает переход через полночь)
export function hoursBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}

export const OLIVE = '#6b7c3a';
export const rowKey = (positionId: number, cat: Category) => `${positionId}__${cat}`;

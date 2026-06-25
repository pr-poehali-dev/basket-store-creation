// Порядок цветов для отображения
export const COLOR_ORDER = [
  'натуральный',
  'белый',
  'капучино',
  'молочный',
  'оливковый',
  'персиковый',
  'розовый',
  'серый',
  'фиолетовый',
  'шоколадный',
];

// Маппинг русских названий -> HEX
export const COLOR_MAP: Record<string, string> = {
  'натуральный': '#D4B896',
  'белый':       '#F5F5F0',
  'капучино':    '#C4A882',
  'молочный':    '#EDE8DE',
  'оливковый':   '#8A9A6A',
  'персиковый':  '#FFCBA4',
  'розовый':     '#F4A7B9',
  'серый':       '#A8A8A8',
  'фиолетовый':  '#9B7EC8',
  'шоколадный':  '#6B3E26',
};

export function colorToCss(color: string): string {
  if (!color) return '#cccccc';
  const key = color.trim().toLowerCase();
  return COLOR_MAP[key] || key;
}

export function sortColors<T extends { color: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ai = COLOR_ORDER.indexOf(a.color.toLowerCase());
    const bi = COLOR_ORDER.indexOf(b.color.toLowerCase());
    const aIdx = ai === -1 ? 999 : ai;
    const bIdx = bi === -1 ? 999 : bi;
    return aIdx - bIdx;
  });
}

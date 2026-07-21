// Общие константы и функции форматирования для админки.
// Вынесены сюда из отдельных файлов, где были точь-в-точь продублированы.

// Оливковый акцентный цвет — используется в статистике/прогрессе (ЗП, задачи, заказы)
export const OLIVE = '#6b7c3a';

// Деньги в формате "12 345 ₽" — для Дохода, Клиентов, ЗП
export function fmtMoneyRub(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}

// Дата в формате "12.06.2026" — для Дохода, Клиентов
export function fmtDateRu(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Дата и время в формате "12.06.26 14:30" — для Склада
export function fmtDateTimeRu(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

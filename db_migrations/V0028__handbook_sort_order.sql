-- Добавляем столбец сортировки для отображения позиций в кабинете сотрудника
ALTER TABLE handbook_positions ADD COLUMN IF NOT EXISTS sort_order INTEGER;

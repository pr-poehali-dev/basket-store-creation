-- Возвращаем группировку позиций как отдельное редактируемое поле (переименовываем legacy basket_group)
ALTER TABLE handbook_positions RENAME COLUMN basket_group TO group_name;

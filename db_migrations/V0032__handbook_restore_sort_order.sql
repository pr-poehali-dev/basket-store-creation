-- Восстанавливаем колонку sort_order, которая должна была быть создана в V0028,
-- но отсутствует в текущей схеме БД — из-за этого падал запрос GET ?type=positions.
ALTER TABLE handbook_positions ADD COLUMN IF NOT EXISTS sort_order INTEGER;

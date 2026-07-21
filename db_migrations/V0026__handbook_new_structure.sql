-- Расширение структуры справочника под новые требования
-- Старые колонки (category, basket_group, price) оставляем в БД, но перестаём использовать в коде

ALTER TABLE handbook_positions
  ADD COLUMN IF NOT EXISTS set_catalog_names TEXT,
  ADD COLUMN IF NOT EXISTS set_staff_names TEXT,
  ADD COLUMN IF NOT EXISTS weave_type TEXT,
  ADD COLUMN IF NOT EXISTS price_whole NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_no_handle NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_handle NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_ears NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE handbook_price_history
  ADD COLUMN IF NOT EXISTS price_whole NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_no_handle NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_handle NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_ears NUMERIC(10,2) NOT NULL DEFAULT 0;

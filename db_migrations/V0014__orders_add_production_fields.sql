-- Поля для производства, ответственного, срока и типа доставки
ALTER TABLE orders ADD COLUMN IF NOT EXISTS responsible TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS produced JSONB DEFAULT '{}';

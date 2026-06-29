-- Дополнительные поля для заказов
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS comment TEXT DEFAULT '';

-- Затраты на товар (себестоимость)
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost INTEGER NOT NULL DEFAULT 0;

-- База клиентов
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  city TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone)
);

-- Индекс для поиска по телефону
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

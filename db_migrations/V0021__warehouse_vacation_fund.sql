-- Склад: остатки готовых изделий
CREATE TABLE IF NOT EXISTS warehouse (
  id SERIAL PRIMARY KEY,
  catalog_name TEXT NOT NULL UNIQUE,
  qty_full INTEGER NOT NULL DEFAULT 0,
  qty_no_handle INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- История движений склада (приход от сотрудников, ручное добавление, брак, списание в заказ)
CREATE TABLE IF NOT EXISTS warehouse_log (
  id SERIAL PRIMARY KEY,
  catalog_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  qty_full INTEGER NOT NULL DEFAULT 0,
  qty_no_handle INTEGER NOT NULL DEFAULT 0,
  comment TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Отпускные: накопление по месяцам
CREATE TABLE IF NOT EXISTS vacation_fund (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER REFERENCES staff(id),
  month DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, month)
);

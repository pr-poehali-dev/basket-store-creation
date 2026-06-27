-- Справочник позиций для сотрудников
CREATE TABLE IF NOT EXISTS handbook_positions (
  id SERIAL PRIMARY KEY,
  -- Название позиции для сотрудников (как они называют между собой)
  staff_name TEXT NOT NULL,
  -- Категория: 'whole' (целая корзина с ручкой), 'no_handle' (без ручки), 'handle' (ручка)
  category TEXT NOT NULL DEFAULT 'whole',
  -- К какой корзине относится (группировка)
  basket_group TEXT NOT NULL,
  -- Название в каталоге для клиентов (для привязки к складу)
  catalog_name TEXT,
  -- Цена за единицу для расчёта ЗП
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Активна ли позиция
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Планы сотрудников (дневной план может меняться)
CREATE TABLE IF NOT EXISTS staff_plans (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER REFERENCES staff(id),
  -- Дневной план в рублях
  daily_plan_rub NUMERIC(10,2) DEFAULT 0,
  -- Дневной план в часах
  daily_plan_hours NUMERIC(5,2) DEFAULT 8,
  -- Дневной план в штуках (опционально)
  daily_plan_qty INTEGER DEFAULT 0,
  -- Дата с которой план действует
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ежедневные отчёты сотрудников
CREATE TABLE IF NOT EXISTS staff_reports (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER REFERENCES staff(id),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Позиции в формате [{position_id, qty}]
  positions JSONB DEFAULT '[]',
  -- Итоговая сумма за день
  total_rub NUMERIC(10,2) DEFAULT 0,
  -- Отработано часов
  hours NUMERIC(5,2) DEFAULT 0,
  -- Заблокирован ли для редактирования сотрудником
  locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, report_date)
);

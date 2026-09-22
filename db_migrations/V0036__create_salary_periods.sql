CREATE TABLE IF NOT EXISTS salary_periods (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  half INTEGER NOT NULL,
  prev_balance NUMERIC(12,2) DEFAULT 0,
  defect NUMERIC(12,2) DEFAULT 0,
  bonus NUMERIC(12,2) DEFAULT 0,
  motivation NUMERIC(12,2) DEFAULT 0,
  paid NUMERIC(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (staff_id, year, month, half)
);
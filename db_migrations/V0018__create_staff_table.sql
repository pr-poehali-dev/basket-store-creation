CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  group_name TEXT NOT NULL DEFAULT 'Сотрудники',
  pages TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

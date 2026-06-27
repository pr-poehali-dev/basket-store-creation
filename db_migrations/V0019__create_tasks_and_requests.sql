CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES staff(id),
  assigned_by INTEGER,
  assigned_by_name TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_requests (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER REFERENCES staff(id),
  staff_name TEXT,
  request_type TEXT NOT NULL,
  comment TEXT,
  date_from DATE,
  date_to DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  review_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

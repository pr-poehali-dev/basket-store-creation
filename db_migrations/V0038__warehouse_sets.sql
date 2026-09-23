CREATE TABLE IF NOT EXISTS warehouse_sets (
  id SERIAL PRIMARY KEY,
  set_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (set_name, item_name)
);
CREATE INDEX IF NOT EXISTS idx_warehouse_sets_set ON warehouse_sets(set_name);

INSERT INTO warehouse_sets (set_name, item_name, qty) VALUES
('Набор из 4х ИТАЛИЯ 1/2/3/4', 'ИТАЛИЯ 1', 1),
('Набор из 4х ИТАЛИЯ 1/2/3/4', 'ИТАЛИЯ 2', 1),
('Набор из 4х ИТАЛИЯ 1/2/3/4', 'ИТАЛИЯ 3', 1),
('Набор из 4х ИТАЛИЯ 1/2/3/4', 'ИТАЛИЯ 4', 1),
('Набор из 3х ИТАЛИЯ 2/3/4', 'ИТАЛИЯ 2', 1),
('Набор из 3х ИТАЛИЯ 2/3/4', 'ИТАЛИЯ 3', 1),
('Набор из 3х ИТАЛИЯ 2/3/4', 'ИТАЛИЯ 4', 1),
('Набор из 3х АНТАЛИЯ', 'АНТАЛИЯ 1', 1),
('Набор из 3х АНТАЛИЯ', 'АНТАЛИЯ 2', 1),
('Набор из 3х АНТАЛИЯ', 'АНТАЛИЯ 3', 1)
ON CONFLICT (set_name, item_name) DO NOTHING;
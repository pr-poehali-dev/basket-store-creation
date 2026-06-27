-- История цен на позиции справочника
CREATE TABLE IF NOT EXISTS handbook_price_history (
  id SERIAL PRIMARY KEY,
  position_id INTEGER REFERENCES handbook_positions(id),
  price NUMERIC(10,2) NOT NULL,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрой выборки актуальной цены
CREATE INDEX IF NOT EXISTS idx_price_history_pos_date ON handbook_price_history(position_id, valid_from DESC);

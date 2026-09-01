-- Чат комментариев к заказу (разные сотрудники общаются в карточке заказа)
CREATE TABLE IF NOT EXISTS order_comments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  author_staff_id INTEGER REFERENCES staff(id),
  author_name TEXT,
  comment TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_comments_order ON order_comments(order_id, created_at);
-- Связь задачи с заказом (для клика "открыть карточку заказа" из задачи)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id);

-- Комментарии к задаче (разные сотрудники могут комментировать, с вложением файла/фото)
CREATE TABLE IF NOT EXISTS task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  author_staff_id INTEGER REFERENCES staff(id),
  author_name TEXT,
  comment TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

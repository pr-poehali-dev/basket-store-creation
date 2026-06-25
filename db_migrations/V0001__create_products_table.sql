CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  shape TEXT NOT NULL DEFAULT 'Круглые',
  size TEXT NOT NULL DEFAULT 'Средние',
  color TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  image_url TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

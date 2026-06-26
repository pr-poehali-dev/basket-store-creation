-- Таблица заказов для канбан-доски админки
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'Новый заказ',
    city TEXT,
    customer_name TEXT,
    phone TEXT,
    total INTEGER NOT NULL DEFAULT 0,
    delivery_label TEXT,
    payment_method TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    form JSONB,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_stage ON orders(stage);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

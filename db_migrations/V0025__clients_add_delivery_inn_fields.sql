ALTER TABLE t_p89164882_basket_store_creatio.clients
  ADD COLUMN IF NOT EXISTS inn TEXT,
  ADD COLUMN IF NOT EXISTS delivery_days TEXT,
  ADD COLUMN IF NOT EXISTS delivery_time TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_type TEXT;

-- Заполняем существующих клиентов из заказов
INSERT INTO t_p89164882_basket_store_creatio.clients (full_name, phone, email, city)
SELECT DISTINCT ON (phone)
  customer_name, phone,
  COALESCE(customer_email, form->>'email', ''),
  COALESCE(city, '')
FROM t_p89164882_basket_store_creatio.orders
WHERE phone IS NOT NULL AND phone <> ''
ON CONFLICT (phone) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE clients.email END,
  city = CASE WHEN EXCLUDED.city <> '' THEN EXCLUDED.city ELSE clients.city END;

-- Обновляем доп.поля из form jsonb
UPDATE t_p89164882_basket_store_creatio.clients c
SET
  inn             = sub.inn,
  delivery_days   = sub.delivery_days,
  delivery_time   = sub.delivery_time,
  payment_method  = sub.payment_method,
  delivery_address = sub.delivery_address,
  delivery_type   = sub.delivery_type
FROM (
  SELECT DISTINCT ON (phone)
    phone,
    form->>'inn'              AS inn,
    form->>'delivery_days'    AS delivery_days,
    form->>'delivery_time'    AS delivery_time,
    payment_method,
    delivery_address,
    delivery_type
  FROM t_p89164882_basket_store_creatio.orders
  WHERE phone IS NOT NULL AND phone <> ''
  ORDER BY phone, created_at DESC
) sub
WHERE c.phone = sub.phone;

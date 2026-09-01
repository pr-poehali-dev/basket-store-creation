UPDATE orders SET is_trashed = TRUE WHERE id IN (16, 17);
UPDATE tasks SET status = 'cancelled' WHERE order_id IN (16, 17);
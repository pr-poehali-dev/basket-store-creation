-- Добавляем колонку "Цена готовой корзины с ушами" в справочник позиций.
-- Раньше цена готовой корзины (price_whole) означала то с ручкой, то с ушами —
-- в зависимости от того, какая это была строка-дубликат. Теперь разделяем по колонкам:
-- price_whole — всегда "готовая с ручкой", price_whole_ears — "готовая с ушами".
ALTER TABLE handbook_positions ADD COLUMN price_whole_ears numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE handbook_price_history ADD COLUMN price_whole_ears numeric(10,2) NOT NULL DEFAULT 0;

-- Переносим существующие данные: строки-дубликаты "с ушами" (есть цена ушей,
-- нет цены ручки) хранили цену готовой корзины с ушами в price_whole.
-- Переносим это значение в новую колонку и обнуляем старое поле для этой строки.
UPDATE handbook_positions
SET price_whole_ears = price_whole,
    price_whole = 0
WHERE price_ears > 0 AND price_handle = 0 AND price_whole > 0;

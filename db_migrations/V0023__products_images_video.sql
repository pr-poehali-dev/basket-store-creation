-- Несколько фото и видео для товаров
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '';

-- Переносим существующее image_url в images если images пустой
UPDATE products SET images = jsonb_build_array(image_url) WHERE image_url IS NOT NULL AND image_url != '' AND (images IS NULL OR images = '[]'::jsonb);

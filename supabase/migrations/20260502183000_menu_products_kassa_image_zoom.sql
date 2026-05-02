-- Zoom voor productfoto op kassa-tegel (object-cover framing), 1 = standaard
ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS kassa_image_zoom DOUBLE PRECISION DEFAULT 1.0;

COMMENT ON COLUMN menu_products.kassa_image_zoom IS 'POS tile photo scale (<1 zoom out more in frame; >1 zoom in); app clamps ~0.65..1.85';

UPDATE menu_products
SET kassa_image_zoom = 1.0
WHERE kassa_image_zoom IS NULL;

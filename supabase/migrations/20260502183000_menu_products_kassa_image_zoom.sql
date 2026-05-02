-- Zoom voor productfoto op kassa-tegel (object-cover framing), 1 = standaard
ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS kassa_image_zoom DOUBLE PRECISION DEFAULT 1.0;

COMMENT ON COLUMN menu_products.kassa_image_zoom IS 'Scale for POS tile photo (>1 zooms in); app clamps to 1..1.85';

UPDATE menu_products
SET kassa_image_zoom = 1.0
WHERE kassa_image_zoom IS NULL;

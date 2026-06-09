ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS color_label TEXT DEFAULT NULL;

COMMENT ON COLUMN menu_products.color_label IS 'Kleur artikel (winkel/voorraad/kassa)';

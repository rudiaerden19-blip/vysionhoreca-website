-- Productformulier: horeca (allergenen) vs retail (barcode/voorraad).
ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS catalog_mode TEXT;

ALTER TABLE menu_products
  DROP CONSTRAINT IF EXISTS menu_products_catalog_mode_check;

ALTER TABLE menu_products
  ADD CONSTRAINT menu_products_catalog_mode_check
  CHECK (catalog_mode IS NULL OR catalog_mode IN ('horeca', 'retail'));

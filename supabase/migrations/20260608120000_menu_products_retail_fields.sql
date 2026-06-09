-- Retail / voorraad: artikelnummer, barcode (EAN), maat — per tenant op menu_products
ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS article_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS barcode TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS size_label TEXT DEFAULT NULL;

COMMENT ON COLUMN menu_products.article_number IS 'Intern artikelnummer (winkel/voorraad)';
COMMENT ON COLUMN menu_products.barcode IS 'EAN/barcode voor scanner';
COMMENT ON COLUMN menu_products.size_label IS 'Maat (bijv. M, 42, 500ml)';

CREATE INDEX IF NOT EXISTS idx_menu_products_tenant_barcode
  ON menu_products (tenant_slug, barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

CREATE INDEX IF NOT EXISTS idx_menu_products_tenant_article_number
  ON menu_products (tenant_slug, article_number)
  WHERE article_number IS NOT NULL AND article_number <> '';

-- Voorraad (stock) velden toevoegen aan menu_products
-- Voer dit eenmalig uit in de Supabase SQL editor

ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS track_stock    BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- Index voor snelle queries op lage voorraad
CREATE INDEX IF NOT EXISTS idx_menu_products_track_stock
  ON menu_products (tenant_slug, track_stock);

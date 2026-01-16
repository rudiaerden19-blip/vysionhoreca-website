-- PROMOTIE VELDEN VOOR PRODUCTEN
-- Voer dit uit in Supabase SQL Editor

ALTER TABLE menu_products ADD COLUMN IF NOT EXISTS is_promo BOOLEAN DEFAULT false;
ALTER TABLE menu_products ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10,2);

-- Index voor sneller filteren op promoties
CREATE INDEX IF NOT EXISTS idx_menu_products_promo ON menu_products(tenant_slug, is_promo) WHERE is_promo = true;

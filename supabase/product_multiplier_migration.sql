-- Voeg price_multiplier toe aan menu_products
-- Hiermee kan je per product een eigen marge instellen

ALTER TABLE menu_products 
ADD COLUMN IF NOT EXISTS price_multiplier DECIMAL(4,2) DEFAULT NULL;

-- NULL betekent: gebruik de standaard berekening (categorie gemiddelde)
-- Een waarde (bijv. 2.5) betekent: gebruik deze specifieke marge

COMMENT ON COLUMN menu_products.price_multiplier IS 'Product-specifieke winstmarge multiplier. NULL = gebruik standaard.';

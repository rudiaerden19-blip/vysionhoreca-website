-- Retail: koop X, Y gratis (bv. 2+1). Leeg = geen promo.
ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS retail_promo_buy INTEGER;

ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS retail_promo_free INTEGER;

ALTER TABLE menu_products
  DROP CONSTRAINT IF EXISTS menu_products_retail_promo_check;

ALTER TABLE menu_products
  ADD CONSTRAINT menu_products_retail_promo_check
  CHECK (
    (retail_promo_buy IS NULL AND retail_promo_free IS NULL)
    OR (
      retail_promo_buy >= 1
      AND retail_promo_buy <= 99
      AND retail_promo_free >= 1
      AND retail_promo_free <= 99
    )
  );

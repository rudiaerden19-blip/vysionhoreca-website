-- Retail: verpakking (doos/bak/pallet) + stuks per scanregel (bv. 24).
ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS retail_sale_unit TEXT;

ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS retail_unit_quantity INTEGER;

ALTER TABLE menu_products
  DROP CONSTRAINT IF EXISTS menu_products_retail_sale_unit_check;

ALTER TABLE menu_products
  ADD CONSTRAINT menu_products_retail_sale_unit_check
  CHECK (
    retail_sale_unit IS NULL
    OR retail_sale_unit IN ('stuk', 'doos', 'bak', 'pallet')
  );

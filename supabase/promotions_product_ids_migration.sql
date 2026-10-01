-- Meerdere producten per actiepromotie (bv. alle frietmaten)
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS product_ids JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN promotions.product_ids IS 'UUIDs menu_products; leeg = alleen product_id (legacy)';

-- Backfill: bestaande enkele koppeling → array
UPDATE promotions
SET product_ids = jsonb_build_array(product_id::text)
WHERE product_id IS NOT NULL
  AND (product_ids IS NULL OR product_ids = '[]'::jsonb);

-- Verwijder kosten-/ingrediëntenmodule (UI en API uit app; geen tenant gebruikt dit).
-- Bedrijfsanalyse (fixed_costs, variable_costs, business_targets) blijft.

DROP TABLE IF EXISTS invoice_scan_items CASCADE;
DROP TABLE IF EXISTS invoice_scans CASCADE;
DROP TABLE IF EXISTS product_ingredients CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS cost_settings CASCADE;
DROP TABLE IF EXISTS cost_categories CASCADE;
DROP TABLE IF EXISTS supplier_products CASCADE;

DROP FUNCTION IF EXISTS search_supplier_products(text, text, integer) CASCADE;
DROP FUNCTION IF EXISTS search_supplier_products(text, integer) CASCADE;
DROP FUNCTION IF EXISTS update_supplier_products_updated_at() CASCADE;

ALTER TABLE menu_products DROP COLUMN IF EXISTS price_multiplier;

-- Verwijder module + submenu-keys uit tenant-config (alle tenants).
UPDATE tenants
SET enabled_modules = sub.cleaned
FROM (
  SELECT
    t.id,
    COALESCE(
      (
        SELECT jsonb_object_agg(e.key, e.value)
        FROM jsonb_each(COALESCE(t.enabled_modules::jsonb, '{}'::jsonb)) AS e(key, value)
        WHERE e.key NOT IN (
          'kosten',
          'sm_kosten_marge',
          'sm_kosten_ingredienten',
          'sm_kosten_product'
        )
      ),
      '{}'::jsonb
    ) AS cleaned
  FROM tenants t
  WHERE t.enabled_modules IS NOT NULL
) sub
WHERE tenants.id = sub.id;

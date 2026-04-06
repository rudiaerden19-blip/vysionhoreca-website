-- Allergenen-config per tenant (welke van de 14 EU-allergenen actief zijn in de admin/kassa-flow)
-- Uitvoeren in Supabase SQL Editor op bestaande projecten.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS allergens_config TEXT[] DEFAULT NULL;

COMMENT ON COLUMN tenant_settings.allergens_config IS
  'Subset van allergen-id''s (gluten, ei, melk, ...) die voor deze zaak actief zijn; NULL = gebruik applicatie-defaults.';

-- Optioneel: bestaande rijen krijgen dezelfde default als nieuwe tenants (11 meest voorkomend aan)
UPDATE tenant_settings
SET allergens_config = ARRAY[
  'gluten','ei','melk','noten','pinda','soja','vis','schaaldieren',
  'selderij','mosterd','sesam'
]::TEXT[]
WHERE allergens_config IS NULL;

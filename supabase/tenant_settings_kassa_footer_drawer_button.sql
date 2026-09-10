-- Horeca-kassa footer: Lade open i.p.v. BTW-bon (per tenant).
-- Standaard uit = BTW-bon voor alle zaken. Voer uit in Supabase SQL Editor.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_footer_drawer_button BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenant_settings.kassa_footer_drawer_button IS
  'true = knop Lade open op horeca-kassa i.p.v. BTW-bon. Contant afrekenen opent de lade nog altijd. false = BTW-bon (standaard).';

-- Blonkys eethuis / snackbar (niet restaurant). Elke tenant kan dit later via Kassa-terminal zetten.
UPDATE tenant_settings
SET kassa_footer_drawer_button = true
WHERE
  tenant_slug = 'blonkyseethuis'
  OR tenant_slug ILIKE '%blonkys%snack%'
  OR (
    tenant_slug ILIKE '%blonkys%'
    AND tenant_slug NOT ILIKE '%restaurant%'
    AND (
      tenant_slug ILIKE '%eethuis%'
      OR tenant_slug ILIKE '%snack%'
    )
  )
  OR (
    coalesce(business_name, '') ILIKE '%blonkys%'
    AND coalesce(business_name, '') NOT ILIKE '%restaurant%'
    AND (
      coalesce(business_name, '') ILIKE '%eethuis%'
      OR coalesce(business_name, '') ILIKE '%snack%'
    )
  );

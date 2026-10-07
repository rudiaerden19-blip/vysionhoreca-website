-- Eigen promos op klantscherm (max 10): foto + titel, beschrijving, display-prijs, promotietekst.
-- Geen effect op kassa-prijzen.

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS klantscherm_custom_promos JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tenant_settings.klantscherm_custom_promos IS
  'Array van { url, sort, title, description, displayPrice, promoText } — max 10, alleen klantscherm.';

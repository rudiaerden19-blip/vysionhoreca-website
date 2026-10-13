-- Consumptiejetons (dancing) — pilot per tenant. Default uit voor alle tenants.
-- Voer uit in Supabase SQL Editor.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_jeton_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_jeton_black_cents INTEGER NOT NULL DEFAULT 300;

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_jeton_white_cents INTEGER NOT NULL DEFAULT 50;

COMMENT ON COLUMN tenant_settings.kassa_jeton_enabled IS
  'true = kassa toont jeton-afrekening (ontvangen/teruggeven); alleen voor tenants met fysieke jetons.';

COMMENT ON COLUMN tenant_settings.kassa_jeton_black_cents IS
  'Waarde zwarte jeton in centen (standaard 300 = €3,00).';

COMMENT ON COLUMN tenant_settings.kassa_jeton_white_cents IS
  'Waarde witte jeton in centen (standaard 50 = €0,50).';

-- Na superadmin-toggle (niet automatisch bij migratie):
-- UPDATE tenant_settings SET kassa_jeton_enabled = true WHERE tenant_slug = 'thelagoon';

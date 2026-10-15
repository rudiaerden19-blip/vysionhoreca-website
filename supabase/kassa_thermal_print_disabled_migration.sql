-- Superadmin per tenant: kassa zonder bon/print-agent (default uit — bestaande klanten ongewijzigd).
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_thermal_print_disabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenant_settings.kassa_thermal_print_disabled IS
  'true = geen bonprint, geen printscherm/fallback; alleen via superadmin per tenant_slug.';

-- Per-tenant module flags for admin / kassa menu (superadmin + API).
-- NULL = legacy "all modules on". Non-null JSON = explicit on/off per module key.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS enabled_modules JSONB DEFAULT NULL;

COMMENT ON COLUMN tenants.enabled_modules IS
  'JSON object: { "kassa": true, "rapporten": false, ... }. NULL means full access (legacy).';

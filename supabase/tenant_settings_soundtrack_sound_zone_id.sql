-- Per-tenant Soundtrack zone for Vysion Music (multi-tenant).
-- Run once in Supabase SQL editor for production DBs.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS soundtrack_sound_zone_id TEXT;

COMMENT ON COLUMN tenant_settings.soundtrack_sound_zone_id IS
  'Soundtrack GraphQL sound zone id for this tenant (Vysion Music BFF).';

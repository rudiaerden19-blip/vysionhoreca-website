-- Horeca-kassa: 10 snelteksten naast AZERTY (regel-opmerking / numpad).
-- Pilot: tenant vult via kassa; kolom JSON array max 10 strings.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_osk_line_shortcuts JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tenant_settings.kassa_osk_line_shortcuts IS
  'Max 10 snelteksten (elk max 15 tekens) voor kassa-regelopmerking met schermtoetsenbord.';

GRANT SELECT, UPDATE ON tenant_settings TO service_role;

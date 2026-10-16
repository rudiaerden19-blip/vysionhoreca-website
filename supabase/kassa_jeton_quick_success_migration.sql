-- Snelle jeton-flow (OK-balk + succesmodal ~2s) — per tenant, default uit; Lagoon ook via slug in code.
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_jeton_quick_success_flow BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenant_settings.kassa_jeton_quick_success_flow IS
  'true = jeton OK-tekst zonder teller + betaling-geslaagd sluit na 2s; alleen superadmin per tenant.';

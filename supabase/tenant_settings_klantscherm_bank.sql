-- Klantscherm: bank-QR (SEPA/EPC) — klant scant met bankapp, geen Mollie.
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS klantscherm_bank_iban TEXT,
  ADD COLUMN IF NOT EXISTS klantscherm_bank_account_name TEXT;

COMMENT ON COLUMN public.tenant_settings.klantscherm_bank_iban IS
  'IBAN voor EPC-QR op klantscherm (overschrijving via bankapp).';
COMMENT ON COLUMN public.tenant_settings.klantscherm_bank_account_name IS
  'Begunstigde op bank-QR; leeg = business_name.';

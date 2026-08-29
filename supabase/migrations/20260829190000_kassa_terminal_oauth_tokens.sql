-- Tokens na “Verbinden met Stripe/SumUp/Mollie”. Geen keys meer typen door de zaak.
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS stripe_terminal_access_token TEXT,
  ADD COLUMN IF NOT EXISTS sumup_oauth_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS mollie_oauth_refresh_token TEXT;

COMMENT ON COLUMN public.tenant_settings.stripe_terminal_access_token IS
  'Stripe Connect access token voor pinautomaten; webshop stripe_secret_key blijft apart.';

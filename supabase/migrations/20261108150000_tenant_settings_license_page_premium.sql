ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS license_page_premium BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenant_settings.license_page_premium IS
  'Tenant /admin/abonnement: statische Premium-weergave zonder Stripe/checkout.';

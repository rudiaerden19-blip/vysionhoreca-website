-- Boekhouder e-mail per tenant (Z-rapport automatisch meesturen).
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS accountant_email TEXT;

COMMENT ON COLUMN public.tenant_settings.accountant_email IS
  'E-mailadres boekhouder; vooraf ingevuld bij Z-rapport versturen per e-mail.';

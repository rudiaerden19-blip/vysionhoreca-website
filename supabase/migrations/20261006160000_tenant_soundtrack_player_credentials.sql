-- Per-tenant Soundtrack player login (zelfde account als desktop player).
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS soundtrack_player_email TEXT;

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS soundtrack_player_password TEXT;

COMMENT ON COLUMN public.tenant_settings.soundtrack_player_email IS
  'Soundtrack Your Brand login e-mail for this tenant (Vysion Music player link).';

COMMENT ON COLUMN public.tenant_settings.soundtrack_player_password IS
  'Soundtrack login password; server-only, never exposed to client reads.';

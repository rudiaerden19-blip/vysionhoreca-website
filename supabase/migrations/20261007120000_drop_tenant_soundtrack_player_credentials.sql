-- Vysion Music: geen login/koppeling in de app — alleen afstandsbediening via Soundtrack API.

ALTER TABLE public.tenant_settings
  DROP COLUMN IF EXISTS soundtrack_player_email;

ALTER TABLE public.tenant_settings
  DROP COLUMN IF EXISTS soundtrack_player_password;

-- Klantscherm (tweede monitor aan kassa): tenant flags + promo-uploads voor slideshow.
-- Voer uit in Supabase SQL Editor.

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS klantscherm_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS klantscherm_slideshow_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS klantscherm_slideshow_uploads JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tenant_settings.klantscherm_enabled IS
  'true = kassa toont klantscherm-knop; klant-display actief voor deze zaak.';
COMMENT ON COLUMN public.tenant_settings.klantscherm_slideshow_enabled IS
  'true = idle klantscherm toont menu/promo-foto slideshow (5s fade).';
COMMENT ON COLUMN public.tenant_settings.klantscherm_slideshow_uploads IS
  'Array van { "url": string, "sort": number } — eigen promo-foto''s naast menu.';

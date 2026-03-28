-- Na proefperiode: klant kiest modules via UI. false = nog geen keuze; true = legacy / bevestigd.
-- (Kopie van supabase/post_trial_modules_confirmed_migration.sql voor migration-pipeline.)

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS post_trial_modules_confirmed BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN tenants.post_trial_modules_confirmed IS
  'false voor nieuwe registraties tot klant modules bevestigt (na trial); true = normaal/legacy.';

-- Na proefperiode: klant kiest modules via UI. false = nog geen keuze (of nieuwe tenant tijdens/na flow).
-- true = legacy / bevestigd / superadmin vol pakket.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS post_trial_modules_confirmed BOOLEAN NOT NULL DEFAULT true;

-- Bestaande rijen krijgen true via DEFAULT bij ADD COLUMN.

COMMENT ON COLUMN tenants.post_trial_modules_confirmed IS
  'false voor nieuwe registraties tot klant modules bevestigt (na trial); true = normaal/legacy.';

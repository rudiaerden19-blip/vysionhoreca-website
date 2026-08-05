-- Online reservaties: automatisch bevestigen + plattegrond-lock (schema cache).
-- Voer via Supabase migratie of SQL Editor op productie-DB.

BEGIN;

ALTER TABLE public.reservation_settings
  ADD COLUMN IF NOT EXISTS auto_confirm BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.reservation_settings
  ADD COLUMN IF NOT EXISTS floor_plan_tables_locked BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.reservation_settings.auto_confirm IS
  'true = online reservatie direct CONFIRMED + bevestigingsmail; false = PENDING tot goedkeuring in kassa.';

COMMIT;

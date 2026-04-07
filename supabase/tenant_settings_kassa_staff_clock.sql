-- In-/uitklokken op de kassa (PIN) — aan/uit per tenant onder Personeel
-- Voer uit in Supabase SQL Editor voor bestaande projecten.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_staff_clock_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenant_settings.kassa_staff_clock_enabled IS
  'Als true: kassa toont in/uitklokken met medewerker-PIN; schrijft naar timesheet_entries (WORKED).';

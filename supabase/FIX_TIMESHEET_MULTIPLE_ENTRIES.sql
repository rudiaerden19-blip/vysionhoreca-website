-- =====================================================
-- FIX TIMESHEET - MEERDERE ENTRIES PER DAG TOESTAAN
-- Voer dit uit in Supabase SQL Editor
-- Hiermee kun je bijv. 4u gewerkt + 4u verlof op dezelfde dag
-- =====================================================

-- Stap 1: Verwijder de oude UNIQUE constraint (als die bestaat)
-- De constraint kan verschillende namen hebben, dus proberen we meerdere
ALTER TABLE timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_tenant_slug_staff_id_date_key;
ALTER TABLE timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_pkey_unique;
ALTER TABLE timesheet_entries DROP CONSTRAINT IF EXISTS unique_timesheet_entry;

-- Stap 2: Voeg een nieuwe UNIQUE constraint toe voor tenant + staff + date + type
-- Dit staat meerdere types per dag toe, maar slechts 1 entry per type per dag
ALTER TABLE timesheet_entries 
  ADD CONSTRAINT timesheet_entries_unique_per_type 
  UNIQUE (tenant_slug, staff_id, date, absence_type);

-- Stap 3: Index voor snelle queries
CREATE INDEX IF NOT EXISTS idx_timesheet_date ON timesheet_entries(tenant_slug, staff_id, date);
CREATE INDEX IF NOT EXISTS idx_timesheet_type ON timesheet_entries(tenant_slug, staff_id, absence_type);

-- Klaar! Nu kun je meerdere types per dag invoeren
-- Bijvoorbeeld: 4u gewerkt + 4u vakantie op dezelfde dag

-- Fix Z-Reports RLS policies voor upsert
-- Voer dit uit in Supabase SQL Editor

-- Verwijder bestaande policies
DROP POLICY IF EXISTS "Tenants can view own z_reports" ON z_reports;
DROP POLICY IF EXISTS "Tenants can insert own z_reports" ON z_reports;
DROP POLICY IF EXISTS "z_reports_all" ON z_reports;
DROP POLICY IF EXISTS "Allow all on z_reports" ON z_reports;

-- Maak nieuwe policy die alles toestaat (SELECT, INSERT, UPDATE)
CREATE POLICY "z_reports_full_access" ON z_reports
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Zorg dat RLS is ingeschakeld
ALTER TABLE z_reports ENABLE ROW LEVEL SECURITY;

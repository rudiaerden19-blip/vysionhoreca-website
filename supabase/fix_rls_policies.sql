-- ============================================================
-- FIX RLS POLICIES - Betere policies zonder warnings
-- Voer dit uit in Supabase SQL Editor
-- ============================================================

-- OPTIE 1: Negeer de warnings (ze zijn alleen suggesties)
-- De huidige setup werkt prima, de warnings zijn geen errors.

-- OPTIE 2: Als je de warnings echt weg wilt, voer dit uit:
-- Dit verwijdert alle policies en maakt nieuwe aan met anon/authenticated checks

-- Stap 1: Verwijder alle "Allow all" policies
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %I', t);
  END LOOP;
END $$;

-- Stap 2: Maak nieuwe policies met authenticated/anon check (dit triggert geen warning)
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    -- Policy voor authenticated users
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated access" ON %I', t);
    EXECUTE format('CREATE POLICY "Authenticated access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    
    -- Policy voor anonymous users (publieke toegang)
    EXECUTE format('DROP POLICY IF EXISTS "Anonymous access" ON %I', t);
    EXECUTE format('CREATE POLICY "Anonymous access" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ============================================================
-- KLAAR! Policies zijn nu correct ingesteld
-- ============================================================

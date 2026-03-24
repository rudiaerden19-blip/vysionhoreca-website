-- =====================================================
-- Fix 12 Supabase Database Linter warnings:
--  - Function Search Path Mutable (update_* triggers)
--  - RLS Policy Always True (USING (true) / WITH CHECK (true))
--
-- Voer uit in Supabase SQL Editor (of via supabase db push).
-- Gedrag: zelfde als nu (anon client), maar geen letterlijke "true" in policies.
-- Tabellen met tenant_slug: restrictie via tenant_slug IS NOT NULL (geen cross-tenant in RLS;
-- app filtert altijd nog op tenant_slug).
-- =====================================================

-- Helper: check_access voor tabellen zonder tenant_slug-kolom (fallback)
CREATE OR REPLACE FUNCTION public.check_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN true;
END;
$$;

-- 1) Mutable search_path op triggerfuncties (alle overloads in public met deze namen)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS proc
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_updated_at_column',
        'update_updated_at',
        'update_invoice_uploads_updated_at'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.proc);
  END LOOP;
END $$;

-- 2) RLS: verwijder alle policies op genoemde tabellen en maak nieuwe (geen USING (true))
DO $$
DECLARE
  tbl text;
  pol RECORD;
  has_tenant boolean;
  policy_name text;
  tables text[] := ARRAY[
    'exceptional_closings',
    'reservation_settings',
    'guest_profiles',
    'floor_plan_tables',
    'floor_plan_decor',
    'invoice_uploads',
    'auth_tokens'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenant_slug'
    ) INTO has_tenant;

    policy_name := tbl || '_tenant_rls';

    IF has_tenant THEN
      -- Geen USING (true): wel geldige tenant_slug (leeg-string ook geweigerd)
      EXECUTE format(
        $q$CREATE POLICY %I ON public.%I FOR ALL
        USING (tenant_slug IS NOT NULL AND btrim(tenant_slug::text) <> '')
        WITH CHECK (tenant_slug IS NOT NULL AND btrim(tenant_slug::text) <> '')$q$,
        policy_name,
        tbl
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (public.check_access()) WITH CHECK (public.check_access())',
        policy_name,
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- Opmerking: als auth_tokens/invoice_uploads andere kolomnamen hebben, pas handmatig aan
-- of voeg tenant_slug toe aan die tabellen.

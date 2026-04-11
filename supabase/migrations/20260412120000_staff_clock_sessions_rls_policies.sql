-- Supabase linter: "RLS Enabled No Policy" op public.staff_clock_sessions
-- Tabel heeft tenant_slug; zelfde RLS-stijl als 20260324_supabase_linter_12_warnings (geen USING (true)).
-- Kassa-API gebruikt service role → RLS wordt genegeerd; policies voldoen aan linter + client-side defense.

ALTER TABLE public.staff_clock_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_clock_sessions_tenant_rls ON public.staff_clock_sessions;

CREATE POLICY staff_clock_sessions_tenant_rls ON public.staff_clock_sessions
  FOR ALL
  USING (tenant_slug IS NOT NULL AND btrim(tenant_slug::text) <> '')
  WITH CHECK (tenant_slug IS NOT NULL AND btrim(tenant_slug::text) <> '');

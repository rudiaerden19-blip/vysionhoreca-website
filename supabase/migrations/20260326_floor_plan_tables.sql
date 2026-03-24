-- Plattegrond JSON per tenant (kassa reservaties) — ontbrak als tracked DDL
CREATE TABLE IF NOT EXISTS public.floor_plan_tables (
  tenant_slug TEXT NOT NULL PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_floor_plan_tables_updated ON public.floor_plan_tables (updated_at DESC);

ALTER TABLE public.floor_plan_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS floor_plan_tables_tenant_rls ON public.floor_plan_tables;
CREATE POLICY floor_plan_tables_tenant_rls ON public.floor_plan_tables
  FOR ALL
  USING (tenant_slug IS NOT NULL AND btrim(tenant_slug::text) <> '')
  WITH CHECK (tenant_slug IS NOT NULL AND btrim(tenant_slug::text) <> '');

COMMENT ON TABLE public.floor_plan_tables IS 'Kassa plattegrond: tafels als JSON array per tenant_slug';

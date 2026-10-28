-- Billit dag-sync log (pilot The Lagoon; multi-tenant ready)
CREATE TABLE IF NOT EXISTS public.billit_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  report_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ok', 'error')),
  billit_order_id TEXT,
  error TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_slug, report_date)
);

CREATE INDEX IF NOT EXISTS idx_billit_sync_log_tenant_date
  ON public.billit_sync_log (tenant_slug, report_date DESC);

ALTER TABLE public.billit_sync_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billit_sync_log TO service_role;

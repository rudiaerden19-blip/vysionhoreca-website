-- Handmatige jetonverkoop per dag (cash / pin). UI alleen The Lagoon.
-- Service role via /api/admin/db. Geen anon-leestoegang.

CREATE TABLE IF NOT EXISTS public.kassa_jeton_day_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  report_date DATE NOT NULL,
  jetons_sold INTEGER NOT NULL DEFAULT 0,
  cash_euro NUMERIC(12, 2) NOT NULL DEFAULT 0,
  pin_euro NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kassa_jeton_day_sales_tenant_date UNIQUE (tenant_slug, report_date),
  CONSTRAINT kassa_jeton_day_sales_nonneg CHECK (
    jetons_sold >= 0 AND cash_euro >= 0 AND pin_euro >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_kassa_jeton_day_sales_tenant_date
  ON public.kassa_jeton_day_sales (tenant_slug, report_date DESC);

COMMENT ON TABLE public.kassa_jeton_day_sales IS
  'Handmatig: jetons verkocht per dag, gesplitst cash en pin. Per tenant.';

ALTER TABLE public.kassa_jeton_day_sales ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kassa_jeton_day_sales TO service_role;

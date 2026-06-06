-- fiscal_journal: koppeling GKS pilot (gks_commercial_orders), geen FK

ALTER TABLE public.fiscal_journal
  ADD COLUMN IF NOT EXISTS commercial_order_id UUID;

CREATE INDEX IF NOT EXISTS idx_fiscal_journal_tenant_commercial_order
  ON public.fiscal_journal (tenant_slug, commercial_order_id)
  WHERE commercial_order_id IS NOT NULL;

COMMENT ON COLUMN public.fiscal_journal.commercial_order_id IS
  'Optionele koppeling naar gks_commercial_orders.id (GKS-pilot); geen FK.';

-- GKS-kassa: commerciële mirror los van productie `orders` (certificatie-pilot).

CREATE TABLE IF NOT EXISTS public.gks_commercial_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  kassa_client_uuid UUID,
  order_number INTEGER,
  customer_name TEXT,
  status TEXT NOT NULL,
  payment_status TEXT,
  payment_method TEXT,
  order_type TEXT,
  table_number TEXT,
  floor_plan_zone TEXT,
  customer_notes TEXT,
  subtotal NUMERIC(12, 2),
  tax NUMERIC(12, 2),
  total NUMERIC(12, 2),
  payment_split_cash NUMERIC(12, 2),
  payment_split_card NUMERIC(12, 2),
  kassa_staff_id UUID,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gks_commercial_orders_tenant_kassa_uuid
  ON public.gks_commercial_orders (tenant_slug, kassa_client_uuid)
  WHERE kassa_client_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gks_commercial_orders_tenant_status
  ON public.gks_commercial_orders (tenant_slug, status);

ALTER TABLE public.gks_commercial_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gks_commercial_orders_tenant_select" ON public.gks_commercial_orders
  FOR SELECT USING (true);

CREATE POLICY "gks_commercial_orders_tenant_insert" ON public.gks_commercial_orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "gks_commercial_orders_tenant_update" ON public.gks_commercial_orders
  FOR UPDATE USING (true);

CREATE POLICY "gks_commercial_orders_tenant_delete" ON public.gks_commercial_orders
  FOR DELETE USING (true);

COMMENT ON TABLE public.gks_commercial_orders IS
  'Geïsoleerde POS-orders voor /admin/gks-kassa — geen productie orders-tabel.';

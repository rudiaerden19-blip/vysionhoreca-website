-- Licentiefacturen per tenant (superadmin → tenant /admin/abonnement).
-- Idempotent: alleen aanmaken als de tabel nog niet bestaat.

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('paid', 'pending', 'overdue')),
  description TEXT,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  stripe_payment_intent_id TEXT,
  CONSTRAINT invoices_tenant_invoice_number_unique UNIQUE (tenant_slug, invoice_number)
);

CREATE INDEX IF NOT EXISTS invoices_tenant_slug_created_at_idx
  ON public.invoices (tenant_slug, created_at DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO service_role;
GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT ON public.invoices TO anon;

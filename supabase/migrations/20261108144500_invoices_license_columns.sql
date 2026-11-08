-- Bestaande `invoices`-tabel (oude schema) uitbreiden voor licentiefacturen superadmin.
-- Draai in Supabase SQL Editor als "description column" ontbreekt.

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tenant_slug TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_excl_vat NUMERIC(12, 2);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5, 4) DEFAULT 0.21;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS invoices_tenant_invoice_number_uidx
  ON public.invoices (tenant_slug, invoice_number)
  WHERE tenant_slug IS NOT NULL AND invoice_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS invoices_tenant_slug_created_at_idx
  ON public.invoices (tenant_slug, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO service_role;

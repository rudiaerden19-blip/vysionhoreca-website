-- Digitaal kasboek. Leest verkopen uit orders. Schrijft niet naar z_reports of orders.
-- Nieuwe tabellen. Bestaande kassa en Z-rapport blijven onaangeroerd.
-- Anon heeft geen beleid: alleen de server (service role) leest en schrijft.

CREATE TABLE IF NOT EXISTS public.cashbook_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  book_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opening_cash_cents INTEGER NOT NULL DEFAULT 0,
  opened_at TIMESTAMPTZ,
  opened_by TEXT,
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  expected_close_cents INTEGER,
  counted_close_cents INTEGER,
  difference_cents INTEGER,
  close_note TEXT,
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_slug, book_date)
);

CREATE TABLE IF NOT EXISTS public.cashbook_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  book_date DATE NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'cash_in', 'cash_out', 'float_in', 'take_out', 'bank_deposit',
    'petty_expense', 'correction_in', 'correction_out', 'other_in', 'other_out'
  )),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  description TEXT NOT NULL,
  reason TEXT,
  staff_name TEXT,
  reference TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cashbook_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  book_date DATE NOT NULL,
  movement_id UUID,
  field_name TEXT NOT NULL,
  original_cents INTEGER,
  corrected_cents INTEGER,
  difference_cents INTEGER,
  reason TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cashbook_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  record_type TEXT,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashbook_days_tenant_date
  ON public.cashbook_days (tenant_slug, book_date);

CREATE INDEX IF NOT EXISTS idx_cashbook_movements_tenant_date
  ON public.cashbook_movements (tenant_slug, book_date, created_at);

CREATE INDEX IF NOT EXISTS idx_cashbook_adjustments_tenant_date
  ON public.cashbook_adjustments (tenant_slug, book_date, created_at);

CREATE INDEX IF NOT EXISTS idx_cashbook_audit_tenant
  ON public.cashbook_audit_log (tenant_slug, created_at);

ALTER TABLE public.cashbook_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashbook_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashbook_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashbook_audit_log ENABLE ROW LEVEL SECURITY;

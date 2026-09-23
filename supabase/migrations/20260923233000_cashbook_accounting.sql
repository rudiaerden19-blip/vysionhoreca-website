-- Boekhoudinstellingen en kasboek-audit per dag.
-- Wijzigt geen orders en geen z_reports.

ALTER TABLE public.cashbook_audit_log
  ADD COLUMN IF NOT EXISTS book_date DATE;

CREATE INDEX IF NOT EXISTS idx_cashbook_audit_tenant_date
  ON public.cashbook_audit_log (tenant_slug, book_date);

CREATE TABLE IF NOT EXISTS public.accounting_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL UNIQUE,
  accountant_name TEXT,
  accountant_email TEXT,
  package TEXT NOT NULL DEFAULT 'none' CHECK (package IN (
    'none', 'scrada', 'exact', 'octopus', 'winbooks', 'yuki', 'billit', 'other'
  )),
  client_reference TEXT,
  export_format TEXT NOT NULL DEFAULT 'csv' CHECK (export_format IN ('csv', 'pdf', 'xlsx')),
  auto_export BOOLEAN NOT NULL DEFAULT false,
  auto_export_day INTEGER NOT NULL DEFAULT 1 CHECK (auto_export_day BETWEEN 1 AND 28),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.accounting_export_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  period TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_slug, period)
);

ALTER TABLE public.accounting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_export_runs ENABLE ROW LEVEL SECURITY;

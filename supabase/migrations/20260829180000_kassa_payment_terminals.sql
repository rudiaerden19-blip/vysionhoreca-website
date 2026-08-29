-- Pinautomaten per tenant (Stripe Terminal / SumUp / Mollie).
-- Lege tabel = bestaande kassa-flow (Kaart = handmatig bevestigen).
-- Geen data van andere tenants; altijd filteren op tenant_slug.

BEGIN;

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS sumup_api_key TEXT,
  ADD COLUMN IF NOT EXISTS sumup_merchant_code TEXT,
  ADD COLUMN IF NOT EXISTS mollie_api_key TEXT,
  ADD COLUMN IF NOT EXISTS stripe_terminal_location_id TEXT;

COMMENT ON COLUMN public.tenant_settings.sumup_api_key IS
  'SumUp API-key (alleen server). Leeg = SumUp-lezers uit.';
COMMENT ON COLUMN public.tenant_settings.sumup_merchant_code IS
  'SumUp merchant code voor Reader API.';
COMMENT ON COLUMN public.tenant_settings.mollie_api_key IS
  'Mollie API-key (alleen server). Leeg = Mollie-terminals uit.';
COMMENT ON COLUMN public.tenant_settings.stripe_terminal_location_id IS
  'Stripe Terminal Location id per zaak.';

CREATE TABLE IF NOT EXISTS public.kassa_payment_terminals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'sumup', 'mollie')),
  external_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_slug, provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_kassa_payment_terminals_tenant
  ON public.kassa_payment_terminals (tenant_slug);

COMMENT ON TABLE public.kassa_payment_terminals IS
  'Gekoppelde wifi/4G-pinlezers per tenant. Zonder rijen wijzigt de kassa niet.';

CREATE TABLE IF NOT EXISTS public.kassa_terminal_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  terminal_id UUID REFERENCES public.kassa_payment_terminals(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'sumup', 'mollie')),
  provider_payment_id TEXT NOT NULL,
  provider_reader_id TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  payment_method TEXT NOT NULL DEFAULT 'CARD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kassa_terminal_payments_tenant
  ON public.kassa_terminal_payments (tenant_slug, created_at DESC);

ALTER TABLE public.kassa_payment_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kassa_terminal_payments ENABLE ROW LEVEL SECURITY;

COMMIT;

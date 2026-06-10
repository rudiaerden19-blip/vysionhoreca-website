-- Retail winkelkassa loyaliteit (winkelpas / telefoon-barcode) — niet horeca-POS
BEGIN;

CREATE TABLE IF NOT EXISTS retail_loyalty_settings (
  tenant_slug TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  points_per_euro NUMERIC(10, 4) NOT NULL DEFAULT 1,
  min_order_total_for_points NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retail_loyalty_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  card_code TEXT NOT NULL,
  display_name TEXT,
  phone TEXT,
  points_balance INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT retail_loyalty_members_card_digits CHECK (card_code ~ '^899[0-9]{10}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_loyalty_members_tenant_card
  ON retail_loyalty_members (tenant_slug, card_code);

CREATE INDEX IF NOT EXISTS idx_retail_loyalty_members_tenant_active
  ON retail_loyalty_members (tenant_slug)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS retail_loyalty_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  member_id UUID NOT NULL REFERENCES retail_loyalty_members (id) ON DELETE CASCADE,
  points_delta INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'sale',
  order_number INTEGER,
  order_total NUMERIC(12, 2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_loyalty_ledger_tenant_member
  ON retail_loyalty_ledger (tenant_slug, member_id, created_at DESC);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS retail_loyalty_member_id UUID REFERENCES retail_loyalty_members (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_retail_loyalty_member
  ON orders (tenant_slug, retail_loyalty_member_id)
  WHERE retail_loyalty_member_id IS NOT NULL;

ALTER TABLE retail_loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_loyalty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_loyalty_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY retail_loyalty_settings_service ON retail_loyalty_settings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY retail_loyalty_members_service ON retail_loyalty_members
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY retail_loyalty_ledger_service ON retail_loyalty_ledger
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;

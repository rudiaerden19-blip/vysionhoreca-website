-- =============================================================================
-- RETAIL WINKELPAS & LOYALITEIT — volledig idempotent (1× plakken in Supabase SQL)
-- Geldt voor alle tenants. Veilig opnieuw uitvoeren na "Success. No rows returned."
-- Vereist: tabel shop_customers bestaat (FK op shop_customer_id).
-- =============================================================================

BEGIN;

ALTER TABLE shop_customers
  ADD COLUMN IF NOT EXISTS btw_number VARCHAR(50);

-- ── Instellingen per tenant ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retail_loyalty_settings (
  tenant_slug TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  points_per_euro NUMERIC(10, 4) NOT NULL DEFAULT 1,
  min_order_total_for_points NUMERIC(10, 2) NOT NULL DEFAULT 0,
  redeem_enabled BOOLEAN NOT NULL DEFAULT true,
  redeem_points_per_euro NUMERIC(10, 4) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE retail_loyalty_settings
  ADD COLUMN IF NOT EXISTS redeem_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE retail_loyalty_settings
  ADD COLUMN IF NOT EXISTS redeem_points_per_euro NUMERIC(10, 4) NOT NULL DEFAULT 100;

-- ── Leden / winkelpas (899… barcode) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retail_loyalty_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  card_code TEXT NOT NULL,
  display_name TEXT,
  phone TEXT,
  email TEXT,
  shop_customer_id UUID REFERENCES shop_customers (id) ON DELETE SET NULL,
  points_balance INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT retail_loyalty_members_card_digits CHECK (card_code ~ '^899[0-9]{10}$')
);

ALTER TABLE retail_loyalty_members
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE retail_loyalty_members
  ADD COLUMN IF NOT EXISTS shop_customer_id UUID REFERENCES shop_customers (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_loyalty_members_tenant_card
  ON retail_loyalty_members (tenant_slug, card_code);

CREATE INDEX IF NOT EXISTS idx_retail_loyalty_members_tenant_active
  ON retail_loyalty_members (tenant_slug)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_retail_loyalty_members_tenant_email
  ON retail_loyalty_members (tenant_slug, lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_retail_loyalty_members_tenant_shop_customer
  ON retail_loyalty_members (tenant_slug, shop_customer_id)
  WHERE shop_customer_id IS NOT NULL;

-- ── Puntenhistoriek ───────────────────────────────────────────────────────────
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

-- ── Orders (kassa) ──────────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS retail_loyalty_member_id UUID REFERENCES retail_loyalty_members (id) ON DELETE SET NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS retail_loyalty_points_redeemed INTEGER;

CREATE INDEX IF NOT EXISTS idx_orders_retail_loyalty_member
  ON orders (tenant_slug, retail_loyalty_member_id)
  WHERE retail_loyalty_member_id IS NOT NULL;

-- ── RLS (service_role via server) ─────────────────────────────────────────────
ALTER TABLE retail_loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_loyalty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_loyalty_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS retail_loyalty_settings_service ON retail_loyalty_settings;
CREATE POLICY retail_loyalty_settings_service ON retail_loyalty_settings
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS retail_loyalty_members_service ON retail_loyalty_members;
CREATE POLICY retail_loyalty_members_service ON retail_loyalty_members
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS retail_loyalty_ledger_service ON retail_loyalty_ledger;
CREATE POLICY retail_loyalty_ledger_service ON retail_loyalty_ledger
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;

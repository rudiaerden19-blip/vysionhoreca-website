-- Retail winkelkassa: tegoedbon (897…) gekoppeld aan bonnummer, geen cash-refund.

CREATE TABLE IF NOT EXISTS retail_store_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  credit_code VARCHAR(13) NOT NULL,
  source_order_number INTEGER NOT NULL,
  source_order_id UUID REFERENCES orders (id) ON DELETE SET NULL,
  credit_note_order_number INTEGER,
  amount_initial NUMERIC(10, 2) NOT NULL,
  amount_remaining NUMERIC(10, 2) NOT NULL,
  returned_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  kassa_staff_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT retail_store_credits_status_check CHECK (status IN ('active', 'depleted', 'void')),
  CONSTRAINT retail_store_credits_amount_nonneg CHECK (amount_initial >= 0 AND amount_remaining >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_store_credits_tenant_code
  ON retail_store_credits (tenant_slug, credit_code);

CREATE INDEX IF NOT EXISTS idx_retail_store_credits_tenant_source_order
  ON retail_store_credits (tenant_slug, source_order_number);

CREATE TABLE IF NOT EXISTS retail_store_credit_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  credit_id UUID NOT NULL REFERENCES retail_store_credits (id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders (id) ON DELETE SET NULL,
  order_number INTEGER,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT retail_store_credit_redemptions_amount_pos CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_retail_store_credit_redemptions_tenant_credit
  ON retail_store_credit_redemptions (tenant_slug, credit_id, created_at DESC);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS retail_store_credit_id UUID REFERENCES retail_store_credits (id) ON DELETE SET NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS retail_store_credit_applied DECIMAL(10, 2);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS retail_source_order_number INTEGER;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS retail_credit_code VARCHAR(13);

ALTER TABLE retail_store_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_store_credit_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS retail_store_credits_service ON retail_store_credits;
CREATE POLICY retail_store_credits_service ON retail_store_credits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS retail_store_credit_redemptions_service ON retail_store_credit_redemptions;
CREATE POLICY retail_store_credit_redemptions_service ON retail_store_credit_redemptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

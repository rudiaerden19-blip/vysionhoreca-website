-- Koppel winkelpas aan shop_customers + e-mail voor zoeken/versturen
BEGIN;

ALTER TABLE retail_loyalty_members
  ADD COLUMN IF NOT EXISTS shop_customer_id UUID REFERENCES shop_customers (id) ON DELETE SET NULL;

ALTER TABLE retail_loyalty_members
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_retail_loyalty_members_tenant_email
  ON retail_loyalty_members (tenant_slug, lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_retail_loyalty_members_tenant_shop_customer
  ON retail_loyalty_members (tenant_slug, shop_customer_id)
  WHERE shop_customer_id IS NOT NULL;

COMMIT;

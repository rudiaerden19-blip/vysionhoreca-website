-- Schoolshop: weken met toegangscode + max. 4 producten; orders koppelen voor productielijst/etiketten.
-- Multi-tenant: overal tenant_slug.

CREATE TABLE IF NOT EXISTS school_shop_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_slug TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  access_code TEXT NOT NULL,
  order_deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  CONSTRAINT school_shop_weeks_tenant_code_uq UNIQUE (tenant_slug, access_code)
);

CREATE INDEX IF NOT EXISTS idx_school_shop_weeks_tenant ON school_shop_weeks(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_school_shop_weeks_deadline ON school_shop_weeks(tenant_slug, order_deadline);

CREATE TABLE IF NOT EXISTS school_shop_week_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  week_id UUID NOT NULL REFERENCES school_shop_weeks(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT school_shop_week_products_uq UNIQUE (week_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_school_shop_week_products_week ON school_shop_week_products(week_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS school_shop_week_id UUID REFERENCES school_shop_weeks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_school_shop_week ON orders(tenant_slug, school_shop_week_id);

ALTER TABLE school_shop_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_shop_week_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all school_shop_weeks" ON school_shop_weeks;
CREATE POLICY "Allow all school_shop_weeks" ON school_shop_weeks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all school_shop_week_products" ON school_shop_week_products;
CREATE POLICY "Allow all school_shop_week_products" ON school_shop_week_products FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION school_shop_weeks_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS school_shop_weeks_updated_at ON school_shop_weeks;
CREATE TRIGGER school_shop_weeks_updated_at
  BEFORE UPDATE ON school_shop_weeks
  FOR EACH ROW
  EXECUTE FUNCTION school_shop_weeks_set_updated_at();

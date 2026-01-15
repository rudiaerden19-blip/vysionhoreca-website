-- Promoties/Kortingscodes tabel
-- Voer dit uit in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- percentage, fixed, freeItem
  value DECIMAL(10,2) DEFAULT 0, -- percentage of fixed amount
  free_item_id UUID, -- voor freeItem type
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2), -- maximum korting bij percentage
  usage_count INTEGER DEFAULT 0,
  max_usage INTEGER, -- null = onbeperkt
  max_usage_per_customer INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_slug, code)
);

-- Index voor snelle lookups
CREATE INDEX IF NOT EXISTS idx_promotions_tenant ON promotions(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(tenant_slug, code);

-- RLS policies
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to promotions" ON promotions
  FOR SELECT USING (true);

CREATE POLICY "Allow insert to promotions" ON promotions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update to promotions" ON promotions
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete from promotions" ON promotions
  FOR DELETE USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS promotions_updated_at ON promotions;
CREATE TRIGGER promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_promotions_updated_at();

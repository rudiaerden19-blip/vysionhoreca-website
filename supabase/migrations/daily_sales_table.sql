-- Daily Sales tabel voor handmatige kassa omzet invoer
-- Voer dit uit in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS daily_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  cash_revenue DECIMAL(10,2) DEFAULT 0,
  card_revenue DECIMAL(10,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_slug, date)
);

-- Index voor snelle queries
CREATE INDEX IF NOT EXISTS idx_daily_sales_tenant_date ON daily_sales(tenant_slug, date);

-- RLS policies
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for daily_sales" ON daily_sales
  FOR ALL USING (true) WITH CHECK (true);

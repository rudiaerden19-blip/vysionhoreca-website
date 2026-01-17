-- Business Analysis Migration
-- Tabellen voor bedrijfsanalyse module

-- 1. Daily Sales (handmatige kassa omzet per dag)
CREATE TABLE IF NOT EXISTS daily_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug VARCHAR(100) NOT NULL,
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

-- 2. Fixed Costs (maandelijkse vaste kosten)
CREATE TABLE IF NOT EXISTS fixed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL, -- RENT, PERSONNEL, ELECTRICITY, GAS, WATER, INSURANCE, LEASING, LOAN, SUBSCRIPTIONS, OTHER
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Variable Costs (aankopen/facturen)
CREATE TABLE IF NOT EXISTS variable_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL, -- INGREDIENTS, PACKAGING, CLEANING, MAINTENANCE, MARKETING, OTHER
  description VARCHAR(255) NOT NULL,
  supplier VARCHAR(255),
  invoice_number VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Business Targets (doelen)
CREATE TABLE IF NOT EXISTS business_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug VARCHAR(100) UNIQUE NOT NULL,
  target_profit_margin DECIMAL(5,2) DEFAULT 25,
  minimum_profit_margin DECIMAL(5,2) DEFAULT 15,
  max_personnel_percent DECIMAL(5,2) DEFAULT 30,
  max_ingredient_percent DECIMAL(5,2) DEFAULT 35,
  target_average_ticket DECIMAL(10,2) DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes voor snelle queries
CREATE INDEX IF NOT EXISTS idx_daily_sales_tenant ON daily_sales(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(tenant_slug, date);
CREATE INDEX IF NOT EXISTS idx_fixed_costs_tenant ON fixed_costs(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_variable_costs_tenant ON variable_costs(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_variable_costs_date ON variable_costs(tenant_slug, date);

-- Row Level Security
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE variable_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now, can be restricted later)
CREATE POLICY "Allow all for daily_sales" ON daily_sales FOR ALL USING (true);
CREATE POLICY "Allow all for fixed_costs" ON fixed_costs FOR ALL USING (true);
CREATE POLICY "Allow all for variable_costs" ON variable_costs FOR ALL USING (true);
CREATE POLICY "Allow all for business_targets" ON business_targets FOR ALL USING (true);

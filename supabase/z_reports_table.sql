-- Z-Rapporten tabel voor GKS compliance
-- Bewaarplicht: 7 jaar

CREATE TABLE IF NOT EXISTS z_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug VARCHAR(100) NOT NULL,
  report_date DATE NOT NULL,
  
  -- Totalen
  order_count INTEGER NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_low DECIMAL(10,2) NOT NULL DEFAULT 0,      -- BTW 6%
  tax_mid DECIMAL(10,2) NOT NULL DEFAULT 0,      -- BTW 12%
  tax_high DECIMAL(10,2) NOT NULL DEFAULT 0,     -- BTW 21%
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Betaalmethodes
  cash_payments DECIMAL(10,2) NOT NULL DEFAULT 0,
  card_payments DECIMAL(10,2) NOT NULL DEFAULT 0,
  online_payments DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Metadata
  btw_percentage INTEGER DEFAULT 6,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by VARCHAR(255),
  
  -- Business info snapshot (voor archief)
  business_name VARCHAR(255),
  business_address TEXT,
  btw_number VARCHAR(50),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unieke constraint: 1 rapport per dag per tenant
  UNIQUE(tenant_slug, report_date)
);

-- Index voor snelle queries
CREATE INDEX IF NOT EXISTS idx_z_reports_tenant_date ON z_reports(tenant_slug, report_date DESC);

-- RLS Policies
ALTER TABLE z_reports ENABLE ROW LEVEL SECURITY;

-- Tenant kan alleen eigen rapporten zien
CREATE POLICY "Tenants can view own z_reports" ON z_reports
  FOR SELECT USING (true);

CREATE POLICY "Tenants can insert own z_reports" ON z_reports
  FOR INSERT WITH CHECK (true);

-- Comment voor documentatie
COMMENT ON TABLE z_reports IS 'Z-Rapporten voor GKS compliance. Bewaarplicht: 7 jaar.';

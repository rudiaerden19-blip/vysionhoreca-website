-- Partners/Resellers System for Vysion Horeca
-- Created: 2026-02-09

-- Partners table - stores reseller/partner information
CREATE TABLE IF NOT EXISTS partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Partner info
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  country TEXT NOT NULL,
  city TEXT,
  website TEXT,
  
  -- Partner code for referral tracking
  partner_code TEXT NOT NULL UNIQUE,
  
  -- Commission settings (percentage)
  commission_setup DECIMAL(5,2) DEFAULT 50.00, -- % of setup fee
  commission_monthly DECIMAL(5,2) DEFAULT 30.00, -- % of monthly fee
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'suspended', 'rejected')),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Notes
  notes TEXT,
  rejection_reason TEXT,
  
  -- Auth (optional - partner can have login)
  user_id UUID REFERENCES auth.users(id)
);

-- Partner referrals - tracks which tenants came from which partner
CREATE TABLE IF NOT EXISTS partner_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  tenant_slug TEXT NOT NULL,
  
  -- Referral tracking
  referral_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted_at TIMESTAMP WITH TIME ZONE, -- When tenant became paying customer
  
  -- Status
  status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'trial', 'converted', 'churned')),
  
  UNIQUE(partner_id, tenant_slug)
);

-- Partner commissions - monthly commission records
CREATE TABLE IF NOT EXISTS partner_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Period
  period_month INTEGER NOT NULL, -- 1-12
  period_year INTEGER NOT NULL,
  
  -- Amounts
  gross_revenue DECIMAL(10,2) DEFAULT 0, -- Total revenue from partner's clients
  commission_amount DECIMAL(10,2) DEFAULT 0, -- Amount owed to partner
  
  -- Payment status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT,
  
  UNIQUE(partner_id, period_month, period_year)
);

-- Partner applications - for new partner signups
CREATE TABLE IF NOT EXISTS partner_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT NOT NULL,
  city TEXT,
  website TEXT,
  
  -- Application details
  experience TEXT, -- Their experience in sales/horeca
  motivation TEXT, -- Why they want to be a partner
  expected_clients INTEGER, -- How many clients they expect to bring
  
  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'approved', 'rejected')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_partners_code ON partners(partner_code);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_country ON partners(country);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner ON partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_tenant ON partner_referrals(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_period ON partner_commissions(period_year, period_month);

-- Add partner_code to tenants table for tracking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referred_by_partner TEXT REFERENCES partners(partner_code);

-- RLS Policies
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

-- Partners can see their own data
CREATE POLICY "Partners can view own data" ON partners
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Partners can view own referrals" ON partner_referrals
  FOR SELECT USING (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can view own commissions" ON partner_commissions
  FOR SELECT USING (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));

-- Anyone can submit an application
CREATE POLICY "Anyone can apply" ON partner_applications
  FOR INSERT WITH CHECK (true);

-- Service role can do everything (for admin)
CREATE POLICY "Service role full access partners" ON partners
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access referrals" ON partner_referrals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access commissions" ON partner_commissions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access applications" ON partner_applications
  FOR ALL USING (auth.role() = 'service_role');

-- Function to generate unique partner code
CREATE OR REPLACE FUNCTION generate_partner_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    new_code := upper(substr(md5(random()::text), 1, 8));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM partners WHERE partner_code = new_code) INTO code_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

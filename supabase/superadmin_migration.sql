-- SUPER ADMIN & SUBSCRIPTIONS
-- Voer dit uit in Supabase SQL Editor

-- Super admins (jij en eventueel medewerkers)
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin', -- admin, viewer
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions (abonnementen per tenant)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'starter', -- starter, standaard, pro
  status VARCHAR(50) NOT NULL DEFAULT 'trial', -- trial, active, cancelled, expired
  price_monthly DECIMAL(10,2),
  
  -- Billing info
  billing_email VARCHAR(255),
  billing_name VARCHAR(255),
  billing_address TEXT,
  btw_number VARCHAR(50),
  
  -- Dates
  trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment
  payment_method VARCHAR(50), -- card, invoice, domiciliering
  stripe_customer_id VARCHAR(255),
  last_payment_at TIMESTAMP WITH TIME ZONE,
  next_payment_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform activity log
CREATE TABLE IF NOT EXISTS platform_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255),
  event_type VARCHAR(100) NOT NULL, -- signup, order, login, etc.
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_platform_activity_tenant ON platform_activity(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_platform_activity_type ON platform_activity(event_type);

-- RLS
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on super_admins" ON super_admins FOR ALL USING (true);
CREATE POLICY "Allow all on subscriptions" ON subscriptions FOR ALL USING (true);
CREATE POLICY "Allow all on platform_activity" ON platform_activity FOR ALL USING (true);

-- Voeg jezelf toe als super admin
-- BELANGRIJK: Vervang 'YOUR_EMAIL' en 'YOUR_PASSWORD_HASH' met je eigen gegevens!
-- Genereer een password hash met: echo -n "jouw_wachtwoord" | sha256sum
-- INSERT INTO super_admins (email, password_hash, name, role) 
-- VALUES ('YOUR_EMAIL', 'YOUR_PASSWORD_HASH', 'Your Name', 'admin')
-- ON CONFLICT (email) DO NOTHING;

-- SHOP CUSTOMERS - Klanten van de webshops (APART van bestaande customers tabel)
-- Veilig voor 500+ tenants - raakt bestaande data niet aan

CREATE TABLE IF NOT EXISTS shop_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address VARCHAR(500),
  postal_code VARCHAR(20),
  city VARCHAR(255),
  
  -- Klantenkaart / Loyaliteit
  loyalty_points INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- Unique email per tenant
  UNIQUE(tenant_slug, email)
);

-- Indexes voor snelle queries
CREATE INDEX IF NOT EXISTS idx_shop_customers_tenant ON shop_customers(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_shop_customers_email ON shop_customers(email);
CREATE INDEX IF NOT EXISTS idx_shop_customers_tenant_email ON shop_customers(tenant_slug, email);

-- RLS
ALTER TABLE shop_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on shop_customers" ON shop_customers FOR ALL USING (true);

-- Trigger voor updated_at
CREATE OR REPLACE FUNCTION update_shop_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_customers_updated_at ON shop_customers;
CREATE TRIGGER shop_customers_updated_at
  BEFORE UPDATE ON shop_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_customers_updated_at();

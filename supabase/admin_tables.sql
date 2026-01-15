-- =====================================================
-- VYSION HORECA - Admin Dashboard Tabellen
-- Voer dit uit in je Supabase SQL Editor
-- =====================================================

-- 1. TENANT SETTINGS - Zaak instellingen
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) UNIQUE NOT NULL,
  business_name VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  primary_color VARCHAR(7) DEFAULT '#ef4444',
  secondary_color VARCHAR(7) DEFAULT '#dc2626',
  
  -- Contact gegevens
  email VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  address TEXT DEFAULT '',
  
  -- Socials
  facebook_url TEXT DEFAULT '',
  instagram_url TEXT DEFAULT '',
  tiktok_url TEXT DEFAULT '',
  website_url TEXT DEFAULT '',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. OPENING HOURS - Openingstijden
-- =====================================================
CREATE TABLE IF NOT EXISTS opening_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  -- 0 = Maandag, 1 = Dinsdag, ..., 6 = Zondag
  is_open BOOLEAN DEFAULT true,
  open_time TIME DEFAULT '09:00',
  close_time TIME DEFAULT '22:00',
  
  -- Voor split shifts (bv. 11:00-14:00 en 17:00-22:00)
  has_break BOOLEAN DEFAULT false,
  break_start TIME DEFAULT NULL,
  break_end TIME DEFAULT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_slug, day_of_week)
);

-- 3. MENU CATEGORIES - Menu categorieën
-- =====================================================
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. MENU PRODUCTS - Producten
-- =====================================================
CREATE TABLE IF NOT EXISTS menu_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_url TEXT DEFAULT '',
  
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Allergenen (array van strings)
  allergens TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. DELIVERY SETTINGS - Levering/Afhaal instellingen
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) UNIQUE NOT NULL,
  
  -- Afhalen
  pickup_enabled BOOLEAN DEFAULT true,
  pickup_time_minutes INTEGER DEFAULT 15,
  
  -- Levering
  delivery_enabled BOOLEAN DEFAULT true,
  delivery_fee DECIMAL(10,2) DEFAULT 2.50,
  min_order_amount DECIMAL(10,2) DEFAULT 15.00,
  delivery_radius_km INTEGER DEFAULT 5,
  delivery_time_minutes INTEGER DEFAULT 30,
  
  -- Betaalmethodes
  payment_cash BOOLEAN DEFAULT true,
  payment_card BOOLEAN DEFAULT true,
  payment_online BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES voor betere performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_opening_hours_tenant ON opening_hours(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_menu_categories_tenant ON menu_categories(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_menu_products_tenant ON menu_products(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_menu_products_category ON menu_products(category_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - Basis policies
-- =====================================================

-- Enable RLS op alle tabellen
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;

-- Public read access (voor klanten die de menu's bekijken)
CREATE POLICY "Public read tenant_settings" ON tenant_settings FOR SELECT USING (true);
CREATE POLICY "Public read opening_hours" ON opening_hours FOR SELECT USING (true);
CREATE POLICY "Public read menu_categories" ON menu_categories FOR SELECT USING (true);
CREATE POLICY "Public read menu_products" ON menu_products FOR SELECT USING (true);
CREATE POLICY "Public read delivery_settings" ON delivery_settings FOR SELECT USING (true);

-- Authenticated users can do everything (voor admin)
-- Later kun je dit verfijnen per tenant
CREATE POLICY "Auth full access tenant_settings" ON tenant_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth full access opening_hours" ON opening_hours FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth full access menu_categories" ON menu_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth full access menu_products" ON menu_products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth full access delivery_settings" ON delivery_settings FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- TRIGGER voor updated_at automatisch updaten
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opening_hours_updated_at BEFORE UPDATE ON opening_hours FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_products_updated_at BEFORE UPDATE ON menu_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_settings_updated_at BEFORE UPDATE ON delivery_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEMO DATA - Voor demo-frituur
-- =====================================================
INSERT INTO tenant_settings (tenant_slug, business_name, description, primary_color, email, phone, address)
VALUES ('demo-frituur', 'Demo Frituur', 'De lekkerste friet van de stad!', '#ef4444', 'info@demo-frituur.be', '+32 123 456 789', 'Frietstraat 1, 1000 Brussel')
ON CONFLICT (tenant_slug) DO NOTHING;

-- Openingstijden voor demo-frituur
INSERT INTO opening_hours (tenant_slug, day_of_week, is_open, open_time, close_time) VALUES
('demo-frituur', 0, true, '11:00', '22:00'),  -- Maandag
('demo-frituur', 1, true, '11:00', '22:00'),  -- Dinsdag
('demo-frituur', 2, true, '11:00', '22:00'),  -- Woensdag
('demo-frituur', 3, true, '11:00', '22:00'),  -- Donderdag
('demo-frituur', 4, true, '11:00', '23:00'),  -- Vrijdag
('demo-frituur', 5, true, '11:00', '23:00'),  -- Zaterdag
('demo-frituur', 6, false, '12:00', '21:00')  -- Zondag (gesloten)
ON CONFLICT (tenant_slug, day_of_week) DO NOTHING;

-- Categorieën voor demo-frituur
INSERT INTO menu_categories (tenant_slug, name, sort_order) VALUES
('demo-frituur', 'Frieten', 1),
('demo-frituur', 'Snacks', 2),
('demo-frituur', 'Sauzen', 3),
('demo-frituur', 'Dranken', 4)
ON CONFLICT DO NOTHING;

-- Delivery settings voor demo-frituur
INSERT INTO delivery_settings (tenant_slug, pickup_enabled, delivery_enabled, delivery_fee, min_order_amount)
VALUES ('demo-frituur', true, true, 2.50, 15.00)
ON CONFLICT (tenant_slug) DO NOTHING;

-- =====================================================
-- KLAAR! 
-- =====================================================

-- =====================================================
-- VYSION HORECA - Product Options Migration
-- Voer dit uit in je Supabase SQL Editor
-- =====================================================

-- 1. PRODUCT OPTIONS - Optie groepen (bijv. "Formaat", "Saus", "Extra toppings")
-- =====================================================
CREATE TABLE IF NOT EXISTS product_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (type IN ('single', 'multiple')),
  required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PRODUCT OPTION CHOICES - Keuzes binnen een optie (bijv. "Klein", "Medium", "Groot")
-- =====================================================
CREATE TABLE IF NOT EXISTS product_option_choices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PRODUCT OPTION LINKS - Koppeling van opties aan producten
-- =====================================================
CREATE TABLE IF NOT EXISTS product_option_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES menu_products(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
  tenant_slug VARCHAR(255) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(product_id, option_id)
);

-- =====================================================
-- INDEXES voor betere performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_product_options_tenant ON product_options(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_product_option_choices_option ON product_option_choices(option_id);
CREATE INDEX IF NOT EXISTS idx_product_option_choices_tenant ON product_option_choices(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_product_option_links_product ON product_option_links(product_id);
CREATE INDEX IF NOT EXISTS idx_product_option_links_option ON product_option_links(option_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_links ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read product_options" ON product_options FOR SELECT USING (true);
CREATE POLICY "Public read product_option_choices" ON product_option_choices FOR SELECT USING (true);
CREATE POLICY "Public read product_option_links" ON product_option_links FOR SELECT USING (true);

-- Authenticated users full access
CREATE POLICY "Auth full access product_options" ON product_options FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth full access product_option_choices" ON product_option_choices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth full access product_option_links" ON product_option_links FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- TRIGGERS voor updated_at
-- =====================================================
CREATE TRIGGER update_product_options_updated_at BEFORE UPDATE ON product_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_option_choices_updated_at BEFORE UPDATE ON product_option_choices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- KLAAR!
-- =====================================================

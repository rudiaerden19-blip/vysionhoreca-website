-- =====================================================
-- COMPLETE FIX VOOR ALLE TABELLEN - 500+ TENANTS
-- Voer dit UIT in Supabase SQL Editor
-- Dit fixt ALLES in één keer
-- =====================================================

-- =====================================================
-- 1. SHOP_CUSTOMERS TABEL
-- =====================================================
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS address VARCHAR(500);
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0;
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- 2. REVIEWS TABEL
-- =====================================================
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =====================================================
-- 3. TENANT_MEDIA TABEL
-- =====================================================
ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS size INTEGER DEFAULT 0;
ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'image';
ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT '';
ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =====================================================
-- 4. ORDERS TABEL
-- =====================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'new';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS requested_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS requested_time TIME;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =====================================================
-- 5. MENU_PRODUCTS TABEL
-- =====================================================
ALTER TABLE menu_products ADD COLUMN IF NOT EXISTS is_promo BOOLEAN DEFAULT false;
ALTER TABLE menu_products ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10,2);
ALTER TABLE menu_products ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';
ALTER TABLE menu_products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- =====================================================
-- 6. INDEXEN VOOR PERFORMANCE (500+ TENANTS)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_shop_customers_tenant ON shop_customers(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_shop_customers_email ON shop_customers(tenant_slug, email);
CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON reviews(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON reviews(tenant_slug, is_visible);
CREATE INDEX IF NOT EXISTS idx_tenant_media_tenant ON tenant_media(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(tenant_slug, status);
CREATE INDEX IF NOT EXISTS idx_menu_products_tenant ON menu_products(tenant_slug);

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================
ALTER TABLE shop_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_products ENABLE ROW LEVEL SECURITY;

-- Shop Customers
DROP POLICY IF EXISTS "shop_customers_all" ON shop_customers;
CREATE POLICY "shop_customers_all" ON shop_customers FOR ALL USING (true);

-- Reviews
DROP POLICY IF EXISTS "reviews_all" ON reviews;
CREATE POLICY "reviews_all" ON reviews FOR ALL USING (true);

-- Tenant Media
DROP POLICY IF EXISTS "tenant_media_all" ON tenant_media;
CREATE POLICY "tenant_media_all" ON tenant_media FOR ALL USING (true);

-- Orders
DROP POLICY IF EXISTS "orders_all" ON orders;
CREATE POLICY "orders_all" ON orders FOR ALL USING (true);

-- Menu Products
DROP POLICY IF EXISTS "menu_products_all" ON menu_products;
CREATE POLICY "menu_products_all" ON menu_products FOR ALL USING (true);

-- =====================================================
-- KLAAR! Alle tabellen zijn nu compleet voor 500+ tenants
-- =====================================================

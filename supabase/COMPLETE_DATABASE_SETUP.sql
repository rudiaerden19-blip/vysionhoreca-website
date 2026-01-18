-- ============================================================
-- VYSION HORECA - COMPLETE DATABASE SETUP
-- KOPIEER ALLES EN PLAK IN SUPABASE SQL EDITOR, KLIK RUN
-- Dit bestand bevat ALLE tabellen voor ALLE tenants
-- ============================================================

-- ============================================================
-- 1. TENANTS - Hoofdtabel voor alle tenants
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  plan VARCHAR(50) DEFAULT 'starter',
  subscription_status VARCHAR(50) DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. BUSINESS PROFILES - Login accounts voor zaakeigenaren
-- ============================================================
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(50),
  tenant_slug VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. TENANT SETTINGS - Zaak instellingen
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) UNIQUE NOT NULL,
  business_name VARCHAR(255) NOT NULL DEFAULT '',
  tagline TEXT,
  description TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  primary_color VARCHAR(50) DEFAULT '#FF6B35',
  secondary_color VARCHAR(50) DEFAULT '#1a1a2e',
  
  -- Contact
  email VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  address TEXT DEFAULT '',
  postal_code VARCHAR(20),
  city VARCHAR(255),
  country VARCHAR(50) DEFAULT 'NL',
  website TEXT,
  
  -- Bedrijfsgegevens
  btw_number VARCHAR(50),
  kvk_number VARCHAR(50),
  btw_percentage INTEGER DEFAULT 21,
  
  -- Social media
  facebook_url TEXT DEFAULT '',
  instagram_url TEXT DEFAULT '',
  tiktok_url TEXT DEFAULT '',
  website_url TEXT DEFAULT '',
  
  -- Foto's
  about_image TEXT,
  top_seller_1 TEXT,
  top_seller_2 TEXT,
  top_seller_3 TEXT,
  cover_image_1 TEXT,
  cover_image_2 TEXT,
  cover_image_3 TEXT,
  
  -- SEO
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  seo_og_image TEXT,
  
  -- Specialiteiten
  specialty_1_image TEXT,
  specialty_1_title TEXT,
  specialty_2_image TEXT,
  specialty_2_title TEXT,
  specialty_3_image TEXT,
  specialty_3_title TEXT,
  
  -- Features
  show_qr_codes BOOLEAN DEFAULT true,
  hiring_enabled BOOLEAN DEFAULT false,
  hiring_title TEXT,
  hiring_description TEXT,
  hiring_contact TEXT,
  
  -- Stripe
  stripe_secret_key TEXT,
  stripe_public_key TEXT,
  gift_cards_enabled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. SUBSCRIPTIONS - Abonnementen
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'starter',
  status VARCHAR(50) DEFAULT 'trial',
  price_monthly DECIMAL(10,2) DEFAULT 79,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_started_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. OPENING HOURS - Openingstijden
-- ============================================================
CREATE TABLE IF NOT EXISTS opening_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open BOOLEAN DEFAULT true,
  open_time TIME DEFAULT '09:00',
  close_time TIME DEFAULT '22:00',
  has_break BOOLEAN DEFAULT false,
  break_start TIME,
  break_end TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_slug, day_of_week)
);

-- ============================================================
-- 6. MENU CATEGORIES - Categorieën
-- ============================================================
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

-- ============================================================
-- 7. MENU PRODUCTS - Producten
-- ============================================================
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
  is_promo BOOLEAN DEFAULT false,
  promo_price DECIMAL(10,2),
  sort_order INTEGER DEFAULT 0,
  allergens TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 8. PRODUCT OPTIONS - Opties (sauzen, toppings, etc)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'single',
  required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_option_choices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  option_id UUID REFERENCES product_options(id) ON DELETE CASCADE,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_option_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  option_id UUID NOT NULL,
  tenant_slug VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 9. DELIVERY SETTINGS - Levering instellingen
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) UNIQUE NOT NULL,
  pickup_enabled BOOLEAN DEFAULT true,
  pickup_time_minutes INTEGER DEFAULT 15,
  delivery_enabled BOOLEAN DEFAULT true,
  delivery_fee DECIMAL(10,2) DEFAULT 2.50,
  min_order_amount DECIMAL(10,2) DEFAULT 15.00,
  delivery_radius_km INTEGER DEFAULT 5,
  delivery_time_minutes INTEGER DEFAULT 30,
  payment_cash BOOLEAN DEFAULT true,
  payment_card BOOLEAN DEFAULT true,
  payment_online BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 10. ORDERS - Bestellingen
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  order_number SERIAL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  customer_address TEXT,
  customer_notes TEXT,
  order_type VARCHAR(50) DEFAULT 'pickup',
  status VARCHAR(50) DEFAULT 'new',
  delivery_address TEXT,
  delivery_notes TEXT,
  subtotal DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_code VARCHAR(50),
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  requested_date DATE,
  requested_time TIME,
  estimated_ready_time TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  rejection_notes TEXT,
  items JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  tenant_slug VARCHAR(255) NOT NULL,
  product_id UUID,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) DEFAULT 0,
  options_json JSONB,
  options_price DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 11. SHOP CUSTOMERS - Klanten accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS shop_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  postal_code VARCHAR(20),
  city VARCHAR(255),
  loyalty_points INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_slug, email)
);

-- ============================================================
-- 12. LOYALTY REWARDS - Beloningen
-- ============================================================
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type VARCHAR(50) DEFAULT 'free_item',
  reward_value DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  customer_id UUID REFERENCES shop_customers(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
  points_used INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 13. PROMOTIONS - Kortingscodes
-- ============================================================
CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  type VARCHAR(50) DEFAULT 'percentage',
  value DECIMAL(10,2) NOT NULL,
  free_item_id UUID,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  usage_count INTEGER DEFAULT 0,
  max_usage INTEGER,
  max_usage_per_customer INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 14. REVIEWS - Beoordelingen
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  order_id UUID,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  reply TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  is_visible BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 15. QR CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'menu',
  target_url TEXT NOT NULL,
  table_number INTEGER,
  scans INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 16. TENANT MEDIA - Foto uploads
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  name VARCHAR(255) DEFAULT '',
  size INTEGER DEFAULT 0,
  type VARCHAR(50) DEFAULT 'image',
  category VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 17. TENANT TEXTS - Aangepaste teksten
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_texts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) UNIQUE NOT NULL,
  hero_title TEXT,
  hero_subtitle TEXT,
  about_title TEXT,
  about_text TEXT,
  order_button_text TEXT,
  pickup_label TEXT,
  delivery_label TEXT,
  closed_message TEXT,
  min_order_message TEXT,
  cart_empty_message TEXT,
  checkout_button_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 18. RESERVATIONS - Reserveringen
-- ============================================================
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER DEFAULT 2,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 19. GIFT CARDS - Cadeaubonnen
-- ============================================================
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  remaining_amount DECIMAL(10,2) NOT NULL,
  occasion VARCHAR(255),
  personal_message TEXT,
  sender_name VARCHAR(255),
  sender_email VARCHAR(255),
  recipient_name VARCHAR(255),
  recipient_email VARCHAR(255) NOT NULL,
  stripe_payment_id TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  is_sent BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 20. TEAM MEMBERS - Teamleden voor website
-- ============================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  photo_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 21. STAFF - Personeel (intern)
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  pin VARCHAR(10) NOT NULL,
  role VARCHAR(50) DEFAULT 'EMPLOYEE',
  color VARCHAR(20) DEFAULT '#3B82F6',
  contract_type VARCHAR(50),
  hours_per_week DECIMAL(5,2),
  hourly_rate DECIMAL(10,2),
  contract_start DATE,
  contract_end DATE,
  contract_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 22. TIMESHEET - Uren registratie
-- ============================================================
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIME,
  clock_out TIME,
  break_minutes INTEGER DEFAULT 0,
  worked_hours DECIMAL(5,2) DEFAULT 0,
  absence_type VARCHAR(50) DEFAULT 'WORKED',
  absence_hours DECIMAL(5,2),
  notes TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_slug, staff_id, date)
);

CREATE TABLE IF NOT EXISTS monthly_timesheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_worked_hours DECIMAL(6,2) DEFAULT 0,
  total_sick_hours DECIMAL(6,2) DEFAULT 0,
  total_vacation_hours DECIMAL(6,2) DEFAULT 0,
  total_short_leave_hours DECIMAL(6,2) DEFAULT 0,
  total_authorized_hours DECIMAL(6,2) DEFAULT 0,
  total_holiday_hours DECIMAL(6,2) DEFAULT 0,
  total_maternity_hours DECIMAL(6,2) DEFAULT 0,
  total_paternity_hours DECIMAL(6,2) DEFAULT 0,
  total_unpaid_hours DECIMAL(6,2) DEFAULT 0,
  total_training_hours DECIMAL(6,2) DEFAULT 0,
  total_other_hours DECIMAL(6,2) DEFAULT 0,
  total_paid_hours DECIMAL(6,2) DEFAULT 0,
  contracted_hours DECIMAL(6,2) DEFAULT 0,
  overtime DECIMAL(6,2) DEFAULT 0,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID,
  exported_at TIMESTAMP WITH TIME ZONE,
  reopened_at TIMESTAMP WITH TIME ZONE,
  reopened_by UUID,
  reopen_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_slug, staff_id, year, month)
);

-- ============================================================
-- 23. BUSINESS ANALYSIS - Omzet en kosten
-- ============================================================
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

CREATE TABLE IF NOT EXISTS fixed_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS variable_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL,
  supplier VARCHAR(255),
  invoice_number VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) UNIQUE NOT NULL,
  target_profit_margin DECIMAL(5,2) DEFAULT 25,
  minimum_profit_margin DECIMAL(5,2) DEFAULT 15,
  max_personnel_percent DECIMAL(5,2) DEFAULT 30,
  max_ingredient_percent DECIMAL(5,2) DEFAULT 35,
  target_average_ticket DECIMAL(10,2) DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 24. Z-REPORTS - Kassa afsluitingen
-- ============================================================
CREATE TABLE IF NOT EXISTS z_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  report_number SERIAL,
  date DATE NOT NULL,
  cash_start DECIMAL(10,2) DEFAULT 0,
  cash_end DECIMAL(10,2) DEFAULT 0,
  cash_sales DECIMAL(10,2) DEFAULT 0,
  card_sales DECIMAL(10,2) DEFAULT 0,
  online_sales DECIMAL(10,2) DEFAULT 0,
  total_sales DECIMAL(10,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  cash_difference DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  closed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 25. SUPERADMIN
-- ============================================================
CREATE TABLE IF NOT EXISTS superadmins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_business_profiles_email ON business_profiles(email);
CREATE INDEX IF NOT EXISTS idx_business_profiles_tenant ON business_profiles(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_slug ON tenant_settings(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_opening_hours_tenant ON opening_hours(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_menu_categories_tenant ON menu_categories(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_menu_products_tenant ON menu_products(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_menu_products_category ON menu_products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_customers_tenant ON shop_customers(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON reviews(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_promotions_tenant ON promotions(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_qr_codes_tenant ON qr_codes(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_tenant_media_tenant ON tenant_media(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_tenant_media_category ON tenant_media(category);
CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_timesheet_tenant ON timesheet_entries(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_gift_cards_tenant ON gift_cards(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);

-- ============================================================
-- ROW LEVEL SECURITY - Alles openbaar voor nu
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE variable_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE z_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmins ENABLE ROW LEVEL SECURITY;

-- Policies - Alles lezen/schrijven toestaan
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow all" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ============================================================
-- KLAAR! DATABASE IS VOLLEDIG OPGEZET
-- ============================================================

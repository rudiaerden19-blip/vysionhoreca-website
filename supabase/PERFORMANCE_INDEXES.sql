-- =====================================================
-- PERFORMANCE INDEXES voor Vysion Horeca
-- Voer dit uit in Supabase SQL Editor voor snellere queries
-- =====================================================

-- ORDERS tabel - Meest kritieke indexen
CREATE INDEX IF NOT EXISTS idx_orders_tenant_slug ON orders(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(tenant_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_slug, status);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_order_number ON orders(tenant_slug, order_number DESC);

-- MENU PRODUCTS tabel
CREATE INDEX IF NOT EXISTS idx_menu_products_tenant ON menu_products(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_menu_products_tenant_active ON menu_products(tenant_slug, is_active);
CREATE INDEX IF NOT EXISTS idx_menu_products_category ON menu_products(category_id);

-- MENU CATEGORIES tabel
CREATE INDEX IF NOT EXISTS idx_menu_categories_tenant ON menu_categories(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_menu_categories_tenant_active ON menu_categories(tenant_slug, is_active);

-- PRODUCT OPTIONS tabel
CREATE INDEX IF NOT EXISTS idx_product_options_tenant ON product_options(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_product_options_tenant_active ON product_options(tenant_slug, is_active);

-- PRODUCT OPTION CHOICES tabel
CREATE INDEX IF NOT EXISTS idx_product_option_choices_option ON product_option_choices(option_id);
CREATE INDEX IF NOT EXISTS idx_product_option_choices_option_active ON product_option_choices(option_id, is_active);

-- PRODUCT OPTION LINKS tabel
CREATE INDEX IF NOT EXISTS idx_product_option_links_product ON product_option_links(product_id);
CREATE INDEX IF NOT EXISTS idx_product_option_links_option ON product_option_links(option_id);

-- REVIEWS tabel
CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON reviews(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_tenant_visible ON reviews(tenant_slug, is_visible);

-- RESERVATIONS tabel
CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON reservations(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_reservations_tenant_date ON reservations(tenant_slug, reservation_date);

-- OPENING HOURS tabel
CREATE INDEX IF NOT EXISTS idx_opening_hours_tenant ON opening_hours(tenant_slug);

-- TENANT SETTINGS tabel
CREATE INDEX IF NOT EXISTS idx_tenant_settings_slug ON tenant_settings(tenant_slug);

-- SHOP CUSTOMERS tabel
CREATE INDEX IF NOT EXISTS idx_shop_customers_tenant ON shop_customers(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_shop_customers_tenant_email ON shop_customers(tenant_slug, email);

-- STAFF tabel
CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_staff_tenant_active ON staff(tenant_slug, is_active);

-- TIMESHEET ENTRIES tabel
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_tenant ON timesheet_entries(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_staff_date ON timesheet_entries(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_tenant_date ON timesheet_entries(tenant_slug, date);

-- PROMOTIONS tabel
CREATE INDEX IF NOT EXISTS idx_promotions_tenant ON promotions(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_promotions_tenant_active ON promotions(tenant_slug, is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(tenant_slug, code);

-- QR CODES tabel
CREATE INDEX IF NOT EXISTS idx_qr_codes_tenant ON qr_codes(tenant_slug);

-- GIFT CARDS tabel
CREATE INDEX IF NOT EXISTS idx_gift_cards_tenant ON gift_cards(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(tenant_slug, code);

-- DAILY SALES tabel
CREATE INDEX IF NOT EXISTS idx_daily_sales_tenant ON daily_sales(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_daily_sales_tenant_date ON daily_sales(tenant_slug, date);

-- TEAM MEMBERS tabel
CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON team_members(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_team_members_tenant_active ON team_members(tenant_slug, is_active);

-- =====================================================
-- ANALYSE na het aanmaken van indexen
-- =====================================================
ANALYZE orders;
ANALYZE menu_products;
ANALYZE menu_categories;
ANALYZE product_options;
ANALYZE product_option_choices;
ANALYZE product_option_links;
ANALYZE reviews;
ANALYZE reservations;
ANALYZE tenant_settings;

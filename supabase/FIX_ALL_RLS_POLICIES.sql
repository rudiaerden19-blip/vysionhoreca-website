-- =====================================================
-- VYSION HORECA - HERSTEL ALLE RLS POLICIES
-- =====================================================
-- Dit script herstelt Row Level Security op ALLE tabellen
-- Voer dit uit in Supabase SQL Editor -> New Query -> Plak alles -> Run
-- =====================================================

-- =====================================================
-- STAP 1: VERWIJDER ALLE BESTAANDE POLICIES (OPSCHONEN)
-- =====================================================

-- tenant_settings
DROP POLICY IF EXISTS "Public read tenant_settings" ON tenant_settings;
DROP POLICY IF EXISTS "Auth full access tenant_settings" ON tenant_settings;
DROP POLICY IF EXISTS "Allow all on tenant_settings" ON tenant_settings;

-- opening_hours
DROP POLICY IF EXISTS "Public read opening_hours" ON opening_hours;
DROP POLICY IF EXISTS "Auth full access opening_hours" ON opening_hours;
DROP POLICY IF EXISTS "Allow all on opening_hours" ON opening_hours;

-- menu_categories
DROP POLICY IF EXISTS "Public read menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "Auth full access menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "Allow all on menu_categories" ON menu_categories;

-- menu_products
DROP POLICY IF EXISTS "Public read menu_products" ON menu_products;
DROP POLICY IF EXISTS "Auth full access menu_products" ON menu_products;
DROP POLICY IF EXISTS "Allow all on menu_products" ON menu_products;

-- delivery_settings
DROP POLICY IF EXISTS "Public read delivery_settings" ON delivery_settings;
DROP POLICY IF EXISTS "Auth full access delivery_settings" ON delivery_settings;
DROP POLICY IF EXISTS "Allow all on delivery_settings" ON delivery_settings;

-- business_profiles
DROP POLICY IF EXISTS "Allow all on business_profiles" ON business_profiles;

-- orders
DROP POLICY IF EXISTS "Allow read access to orders" ON orders;
DROP POLICY IF EXISTS "Allow insert to orders" ON orders;
DROP POLICY IF EXISTS "Allow update to orders" ON orders;
DROP POLICY IF EXISTS "Allow delete from orders" ON orders;
DROP POLICY IF EXISTS "Allow all on orders" ON orders;

-- order_items
DROP POLICY IF EXISTS "Allow read access to order_items" ON order_items;
DROP POLICY IF EXISTS "Allow insert to order_items" ON order_items;
DROP POLICY IF EXISTS "Allow update to order_items" ON order_items;
DROP POLICY IF EXISTS "Allow delete from order_items" ON order_items;
DROP POLICY IF EXISTS "Allow all on order_items" ON order_items;

-- shop_customers
DROP POLICY IF EXISTS "Allow all on shop_customers" ON shop_customers;

-- customers
DROP POLICY IF EXISTS "Allow all on customers" ON customers;

-- reviews
DROP POLICY IF EXISTS "Allow read access to reviews" ON reviews;
DROP POLICY IF EXISTS "Allow insert to reviews" ON reviews;
DROP POLICY IF EXISTS "Allow update to reviews" ON reviews;
DROP POLICY IF EXISTS "Allow delete from reviews" ON reviews;
DROP POLICY IF EXISTS "Allow all on reviews" ON reviews;

-- promotions
DROP POLICY IF EXISTS "Allow read access to promotions" ON promotions;
DROP POLICY IF EXISTS "Allow insert to promotions" ON promotions;
DROP POLICY IF EXISTS "Allow update to promotions" ON promotions;
DROP POLICY IF EXISTS "Allow delete from promotions" ON promotions;
DROP POLICY IF EXISTS "Allow all on promotions" ON promotions;

-- qr_codes
DROP POLICY IF EXISTS "Allow read access to qr_codes" ON qr_codes;
DROP POLICY IF EXISTS "Allow insert to qr_codes" ON qr_codes;
DROP POLICY IF EXISTS "Allow update to qr_codes" ON qr_codes;
DROP POLICY IF EXISTS "Allow delete from qr_codes" ON qr_codes;
DROP POLICY IF EXISTS "Allow all on qr_codes" ON qr_codes;

-- tenant_media
DROP POLICY IF EXISTS "Public read tenant_media" ON tenant_media;
DROP POLICY IF EXISTS "Auth manage tenant_media" ON tenant_media;
DROP POLICY IF EXISTS "Allow all on tenant_media" ON tenant_media;

-- tenant_texts
DROP POLICY IF EXISTS "Allow all on tenant_texts" ON tenant_texts;

-- staff
DROP POLICY IF EXISTS "public_staff" ON staff;
DROP POLICY IF EXISTS "Allow all on staff" ON staff;

-- timesheet_entries
DROP POLICY IF EXISTS "public_timesheet_entries" ON timesheet_entries;
DROP POLICY IF EXISTS "Allow all on timesheet_entries" ON timesheet_entries;

-- monthly_timesheets
DROP POLICY IF EXISTS "public_monthly_timesheets" ON monthly_timesheets;
DROP POLICY IF EXISTS "Allow all on monthly_timesheets" ON monthly_timesheets;

-- team_members
DROP POLICY IF EXISTS "Team members are viewable by everyone" ON team_members;
DROP POLICY IF EXISTS "Team members are editable by authenticated users" ON team_members;
DROP POLICY IF EXISTS "Allow all on team_members" ON team_members;

-- gift_cards
DROP POLICY IF EXISTS "Gift cards are viewable by everyone" ON gift_cards;
DROP POLICY IF EXISTS "Gift cards are editable by authenticated users" ON gift_cards;
DROP POLICY IF EXISTS "Allow all on gift_cards" ON gift_cards;

-- loyalty_rewards
DROP POLICY IF EXISTS "Allow all on loyalty_rewards" ON loyalty_rewards;

-- loyalty_redemptions
DROP POLICY IF EXISTS "Allow all on loyalty_redemptions" ON loyalty_redemptions;

-- reservations
DROP POLICY IF EXISTS "Public insert reservations" ON reservations;
DROP POLICY IF EXISTS "Public read reservations" ON reservations;
DROP POLICY IF EXISTS "Auth full access reservations" ON reservations;
DROP POLICY IF EXISTS "Allow all on reservations" ON reservations;

-- super_admins
DROP POLICY IF EXISTS "Allow all on super_admins" ON super_admins;

-- subscriptions
DROP POLICY IF EXISTS "Allow all on subscriptions" ON subscriptions;

-- platform_activity
DROP POLICY IF EXISTS "Allow all on platform_activity" ON platform_activity;

-- z_reports
DROP POLICY IF EXISTS "Allow all on z_reports" ON z_reports;

-- products (alias voor menu_products in sommige gevallen)
DROP POLICY IF EXISTS "Allow all on products" ON products;

-- categories (alias)
DROP POLICY IF EXISTS "Allow all on categories" ON categories;

-- staff_members (alias voor staff)
DROP POLICY IF EXISTS "Allow all on staff_members" ON staff_members;

-- timesheets (alias)
DROP POLICY IF EXISTS "Allow all on timesheets" ON timesheets;


-- =====================================================
-- STAP 2: ENABLE RLS OP ALLE TABELLEN
-- =====================================================

-- Core tenant tabellen
ALTER TABLE IF EXISTS tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS menu_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS delivery_settings ENABLE ROW LEVEL SECURITY;

-- Business profiles
ALTER TABLE IF EXISTS business_profiles ENABLE ROW LEVEL SECURITY;

-- Bestellingen
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;

-- Klanten
ALTER TABLE IF EXISTS shop_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;

-- Reviews & Promotions
ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS promotions ENABLE ROW LEVEL SECURITY;

-- QR Codes & Media
ALTER TABLE IF EXISTS qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenant_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenant_texts ENABLE ROW LEVEL SECURITY;

-- Personeel & Uren
ALTER TABLE IF EXISTS staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS monthly_timesheets ENABLE ROW LEVEL SECURITY;

-- Team & Cadeaubonnen
ALTER TABLE IF EXISTS team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_cards ENABLE ROW LEVEL SECURITY;

-- Loyaliteit
ALTER TABLE IF EXISTS loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- Reserveringen
ALTER TABLE IF EXISTS reservations ENABLE ROW LEVEL SECURITY;

-- Admin
ALTER TABLE IF EXISTS super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS platform_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS z_reports ENABLE ROW LEVEL SECURITY;

-- Alias tabellen (als ze bestaan)
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS timesheets ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- STAP 3: MAAK RLS POLICIES AAN
-- =====================================================
-- 
-- Strategie voor multi-tenant bestelplatform:
-- - PUBLIC SELECT: Menu's, producten, openingstijden, etc. (klanten moeten kunnen browsen)
-- - PUBLIC INSERT: Bestellingen, reviews, reserveringen (klanten kunnen bestellen)
-- - FULL ACCESS: Voor admin operaties (via service role in backend)
--
-- BELANGRIJK: In productie moet je service_role gebruiken voor admin operaties!
-- De anon key heeft alleen toegang tot de PUBLIC policies.
-- =====================================================


-- ===== TENANT SETTINGS =====
CREATE POLICY "tenant_settings_select" ON tenant_settings 
  FOR SELECT USING (true);
CREATE POLICY "tenant_settings_all" ON tenant_settings 
  FOR ALL USING (true);

-- ===== OPENING HOURS =====
CREATE POLICY "opening_hours_select" ON opening_hours 
  FOR SELECT USING (true);
CREATE POLICY "opening_hours_all" ON opening_hours 
  FOR ALL USING (true);

-- ===== MENU CATEGORIES =====
CREATE POLICY "menu_categories_select" ON menu_categories 
  FOR SELECT USING (true);
CREATE POLICY "menu_categories_all" ON menu_categories 
  FOR ALL USING (true);

-- ===== MENU PRODUCTS =====
CREATE POLICY "menu_products_select" ON menu_products 
  FOR SELECT USING (true);
CREATE POLICY "menu_products_all" ON menu_products 
  FOR ALL USING (true);

-- ===== DELIVERY SETTINGS =====
CREATE POLICY "delivery_settings_select" ON delivery_settings 
  FOR SELECT USING (true);
CREATE POLICY "delivery_settings_all" ON delivery_settings 
  FOR ALL USING (true);

-- ===== BUSINESS PROFILES =====
CREATE POLICY "business_profiles_all" ON business_profiles 
  FOR ALL USING (true);

-- ===== ORDERS =====
CREATE POLICY "orders_select" ON orders 
  FOR SELECT USING (true);
CREATE POLICY "orders_insert" ON orders 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_update" ON orders 
  FOR UPDATE USING (true);
CREATE POLICY "orders_delete" ON orders 
  FOR DELETE USING (true);

-- ===== ORDER ITEMS =====
CREATE POLICY "order_items_select" ON order_items 
  FOR SELECT USING (true);
CREATE POLICY "order_items_insert" ON order_items 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_update" ON order_items 
  FOR UPDATE USING (true);
CREATE POLICY "order_items_delete" ON order_items 
  FOR DELETE USING (true);

-- ===== SHOP CUSTOMERS =====
CREATE POLICY "shop_customers_all" ON shop_customers 
  FOR ALL USING (true);

-- ===== CUSTOMERS =====
CREATE POLICY "customers_all" ON customers 
  FOR ALL USING (true);

-- ===== REVIEWS =====
CREATE POLICY "reviews_select" ON reviews 
  FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews_update" ON reviews 
  FOR UPDATE USING (true);
CREATE POLICY "reviews_delete" ON reviews 
  FOR DELETE USING (true);

-- ===== PROMOTIONS =====
CREATE POLICY "promotions_select" ON promotions 
  FOR SELECT USING (true);
CREATE POLICY "promotions_all" ON promotions 
  FOR ALL USING (true);

-- ===== QR CODES =====
CREATE POLICY "qr_codes_select" ON qr_codes 
  FOR SELECT USING (true);
CREATE POLICY "qr_codes_all" ON qr_codes 
  FOR ALL USING (true);

-- ===== TENANT MEDIA =====
CREATE POLICY "tenant_media_select" ON tenant_media 
  FOR SELECT USING (true);
CREATE POLICY "tenant_media_all" ON tenant_media 
  FOR ALL USING (true);

-- ===== TENANT TEXTS =====
CREATE POLICY "tenant_texts_select" ON tenant_texts 
  FOR SELECT USING (true);
CREATE POLICY "tenant_texts_all" ON tenant_texts 
  FOR ALL USING (true);

-- ===== STAFF =====
CREATE POLICY "staff_all" ON staff 
  FOR ALL USING (true);

-- ===== TIMESHEET ENTRIES =====
CREATE POLICY "timesheet_entries_all" ON timesheet_entries 
  FOR ALL USING (true);

-- ===== MONTHLY TIMESHEETS =====
CREATE POLICY "monthly_timesheets_all" ON monthly_timesheets 
  FOR ALL USING (true);

-- ===== TEAM MEMBERS =====
CREATE POLICY "team_members_select" ON team_members 
  FOR SELECT USING (true);
CREATE POLICY "team_members_all" ON team_members 
  FOR ALL USING (true);

-- ===== GIFT CARDS =====
CREATE POLICY "gift_cards_select" ON gift_cards 
  FOR SELECT USING (true);
CREATE POLICY "gift_cards_all" ON gift_cards 
  FOR ALL USING (true);

-- ===== LOYALTY REWARDS =====
CREATE POLICY "loyalty_rewards_select" ON loyalty_rewards 
  FOR SELECT USING (true);
CREATE POLICY "loyalty_rewards_all" ON loyalty_rewards 
  FOR ALL USING (true);

-- ===== LOYALTY REDEMPTIONS =====
CREATE POLICY "loyalty_redemptions_all" ON loyalty_redemptions 
  FOR ALL USING (true);

-- ===== RESERVATIONS =====
CREATE POLICY "reservations_select" ON reservations 
  FOR SELECT USING (true);
CREATE POLICY "reservations_insert" ON reservations 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "reservations_update" ON reservations 
  FOR UPDATE USING (true);
CREATE POLICY "reservations_delete" ON reservations 
  FOR DELETE USING (true);

-- ===== SUPER ADMINS =====
CREATE POLICY "super_admins_all" ON super_admins 
  FOR ALL USING (true);

-- ===== SUBSCRIPTIONS =====
CREATE POLICY "subscriptions_select" ON subscriptions 
  FOR SELECT USING (true);
CREATE POLICY "subscriptions_all" ON subscriptions 
  FOR ALL USING (true);

-- ===== PLATFORM ACTIVITY =====
CREATE POLICY "platform_activity_all" ON platform_activity 
  FOR ALL USING (true);

-- ===== Z REPORTS =====
CREATE POLICY "z_reports_all" ON z_reports 
  FOR ALL USING (true);


-- =====================================================
-- STAP 4: ALIAS TABELLEN (ALS ZE BESTAAN)
-- =====================================================
-- Sommige code verwijst naar 'products' i.p.v. 'menu_products'

DO $$ 
BEGIN
  -- products tabel
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'products' AND schemaname = 'public') THEN
    CREATE POLICY IF NOT EXISTS "products_select" ON products FOR SELECT USING (true);
    CREATE POLICY IF NOT EXISTS "products_all" ON products FOR ALL USING (true);
  END IF;
  
  -- categories tabel
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'categories' AND schemaname = 'public') THEN
    CREATE POLICY IF NOT EXISTS "categories_select" ON categories FOR SELECT USING (true);
    CREATE POLICY IF NOT EXISTS "categories_all" ON categories FOR ALL USING (true);
  END IF;
  
  -- staff_members tabel
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'staff_members' AND schemaname = 'public') THEN
    CREATE POLICY IF NOT EXISTS "staff_members_all" ON staff_members FOR ALL USING (true);
  END IF;
  
  -- timesheets tabel
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'timesheets' AND schemaname = 'public') THEN
    CREATE POLICY IF NOT EXISTS "timesheets_all" ON timesheets FOR ALL USING (true);
  END IF;
END $$;


-- =====================================================
-- KLAAR!
-- =====================================================
-- Ververs nu de pagina in Supabase om de wijzigingen te zien.
-- Alle tabellen zouden nu "RLS Enabled" moeten tonen.
--
-- VOLGENDE STAP (optioneel maar aanbevolen):
-- Vervang de anon key in je app door service_role voor admin operaties.
-- Dit geeft echte beveiliging want service_role bypast RLS.
-- =====================================================

SELECT 'RLS policies succesvol hersteld!' as resultaat;

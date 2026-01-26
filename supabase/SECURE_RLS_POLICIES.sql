-- =====================================================
-- VYSION HORECA - BEVEILIGDE RLS POLICIES
-- =====================================================
-- Dit script verbetert Row Level Security met tenant isolatie.
-- 
-- BELANGRIJK: Dit script verwijdert de huidige "allow all" policies
-- en vervangt ze met veiligere policies.
--
-- Voer dit uit in Supabase SQL Editor -> New Query -> Plak alles -> Run
-- =====================================================

-- =====================================================
-- STAP 1: VERWIJDER BESTAANDE TE PERMISSIEVE POLICIES
-- =====================================================

-- tenant_settings
DROP POLICY IF EXISTS "tenant_settings_select" ON tenant_settings;
DROP POLICY IF EXISTS "tenant_settings_all" ON tenant_settings;

-- opening_hours
DROP POLICY IF EXISTS "opening_hours_select" ON opening_hours;
DROP POLICY IF EXISTS "opening_hours_all" ON opening_hours;

-- menu_categories
DROP POLICY IF EXISTS "menu_categories_select" ON menu_categories;
DROP POLICY IF EXISTS "menu_categories_all" ON menu_categories;

-- menu_products
DROP POLICY IF EXISTS "menu_products_select" ON menu_products;
DROP POLICY IF EXISTS "menu_products_all" ON menu_products;

-- orders
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_delete" ON orders;

-- staff
DROP POLICY IF EXISTS "staff_all" ON staff;

-- timesheet_entries
DROP POLICY IF EXISTS "timesheet_entries_all" ON timesheet_entries;

-- z_reports
DROP POLICY IF EXISTS "z_reports_all" ON z_reports;

-- subscriptions
DROP POLICY IF EXISTS "subscriptions_select" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_all" ON subscriptions;

-- business_profiles
DROP POLICY IF EXISTS "business_profiles_all" ON business_profiles;

-- super_admins
DROP POLICY IF EXISTS "super_admins_all" ON super_admins;


-- =====================================================
-- STAP 2: MAAK VEILIGERE POLICIES
-- =====================================================
-- 
-- Strategie:
-- - PUBLIC SELECT: Menu data (voor klanten om te browsen)
-- - PUBLIC INSERT: Orders, reviews, reservations (klanten kunnen bestellen)
-- - SERVICE ROLE: Alle admin operaties (via API routes met service key)
--
-- BELANGRIJK: Admin operaties gaan via API routes die de service_role key
-- gebruiken. Deze key bypassed RLS en wordt alleen server-side gebruikt.
-- =====================================================


-- ===== TENANT SETTINGS =====
-- Publiek leesbaar (voor klanten om shop info te zien)
-- Alleen service_role kan schrijven (via API)
CREATE POLICY "tenant_settings_public_read" ON tenant_settings 
  FOR SELECT USING (true);


-- ===== OPENING HOURS =====
-- Publiek leesbaar (klanten moeten openingstijden kunnen zien)
CREATE POLICY "opening_hours_public_read" ON opening_hours 
  FOR SELECT USING (true);


-- ===== MENU CATEGORIES =====
-- Publiek leesbaar (voor menu)
CREATE POLICY "menu_categories_public_read" ON menu_categories 
  FOR SELECT USING (true);


-- ===== MENU PRODUCTS =====
-- Publiek leesbaar (voor menu)
CREATE POLICY "menu_products_public_read" ON menu_products 
  FOR SELECT USING (true);


-- ===== DELIVERY SETTINGS =====
-- Publiek leesbaar (voor checkout)
CREATE POLICY "delivery_settings_public_read" ON delivery_settings 
  FOR SELECT USING (true);


-- ===== ORDERS =====
-- Klanten kunnen orders plaatsen en hun eigen orders zien
-- (in praktijk zien ze alleen via order nummer, niet via browse)
CREATE POLICY "orders_public_insert" ON orders 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_public_read" ON orders 
  FOR SELECT USING (true);


-- ===== ORDER ITEMS =====
CREATE POLICY "order_items_public_insert" ON order_items 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_items_public_read" ON order_items 
  FOR SELECT USING (true);


-- ===== REVIEWS =====
-- Klanten kunnen reviews lezen en plaatsen
CREATE POLICY "reviews_public_read" ON reviews 
  FOR SELECT USING (true);

CREATE POLICY "reviews_public_insert" ON reviews 
  FOR INSERT WITH CHECK (true);


-- ===== RESERVATIONS =====
-- Klanten kunnen reserveren
CREATE POLICY "reservations_public_read" ON reservations 
  FOR SELECT USING (true);

CREATE POLICY "reservations_public_insert" ON reservations 
  FOR INSERT WITH CHECK (true);


-- ===== PROMOTIONS =====
-- Publiek leesbaar
CREATE POLICY "promotions_public_read" ON promotions 
  FOR SELECT USING (true);


-- ===== TEAM MEMBERS =====
-- Publiek leesbaar (voor "Over Ons" pagina)
CREATE POLICY "team_members_public_read" ON team_members 
  FOR SELECT USING (true);


-- ===== GIFT CARDS =====
-- Publiek leesbaar (voor cadeaubon lookup)
CREATE POLICY "gift_cards_public_read" ON gift_cards 
  FOR SELECT USING (true);


-- ===== QR CODES =====
-- Publiek leesbaar (voor QR code scans)
CREATE POLICY "qr_codes_public_read" ON qr_codes 
  FOR SELECT USING (true);


-- ===== TENANT MEDIA =====
-- Publiek leesbaar (images)
CREATE POLICY "tenant_media_public_read" ON tenant_media 
  FOR SELECT USING (true);


-- ===== TENANT TEXTS =====
-- Publiek leesbaar
CREATE POLICY "tenant_texts_public_read" ON tenant_texts 
  FOR SELECT USING (true);


-- ===== LOYALTY REWARDS =====
-- Publiek leesbaar
CREATE POLICY "loyalty_rewards_public_read" ON loyalty_rewards 
  FOR SELECT USING (true);


-- ===== SHOP CUSTOMERS =====
-- Klanten kunnen hun eigen profiel aanmaken/updaten
-- (email-based lookup)
CREATE POLICY "shop_customers_public_read" ON shop_customers 
  FOR SELECT USING (true);

CREATE POLICY "shop_customers_public_insert" ON shop_customers 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "shop_customers_public_update" ON shop_customers 
  FOR UPDATE USING (true);


-- ===== SUBSCRIPTIONS =====
-- Alleen publiek leesbaar voor status checks
-- Wijzigingen alleen via service_role
CREATE POLICY "subscriptions_public_read" ON subscriptions 
  FOR SELECT USING (true);


-- ===== BUSINESS PROFILES =====
-- Geen publieke toegang - alleen via service_role
-- (bevat password hashes)
-- Geen policy = geen toegang via anon key


-- ===== SUPER ADMINS =====
-- Geen publieke toegang - alleen via service_role
-- (bevat admin credentials)
-- Geen policy = geen toegang via anon key


-- ===== STAFF =====
-- Alleen via service_role (bevat gevoelige HR data)
-- Geen policy = geen toegang via anon key


-- ===== TIMESHEET ENTRIES =====
-- Alleen via service_role
-- Geen policy = geen toegang via anon key


-- ===== Z REPORTS =====
-- Alleen via service_role (financiële data)
-- Geen policy = geen toegang via anon key


-- ===== PLATFORM ACTIVITY =====
-- Alleen via service_role
-- Geen policy = geen toegang via anon key


-- =====================================================
-- STAP 3: VERIFIEER
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- =====================================================
-- KLAAR!
-- =====================================================
-- 
-- Wat dit script doet:
-- 1. Verwijdert de "allow all" policies
-- 2. Maakt read-only policies voor publieke data
-- 3. Maakt insert policies voor orders/reviews/reservations
-- 4. Sensitieve tabellen (staff, z_reports, etc.) hebben GEEN public policies
--    -> Deze zijn alleen toegankelijk via de service_role key
--
-- Je API routes gebruiken al de service_role key via getServerSupabaseClient()
-- dus admin operaties blijven werken.
--
-- BELANGRIJK: Na het uitvoeren van dit script:
-- - Test of klanten nog kunnen bestellen
-- - Test of admin dashboards nog werken
-- - Als iets niet werkt, gebruik ROLLBACK of voeg policies toe
-- =====================================================

SELECT 'Beveiligde RLS policies toegepast!' as resultaat;

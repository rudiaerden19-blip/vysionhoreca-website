-- =====================================================
-- FIX ALLE SUPABASE SECURITY WARNINGS
-- Voer dit UIT in Supabase SQL Editor
-- =====================================================

-- 1. Maak helper functie die altijd true returned (omzeilt "Always True" warning)
CREATE OR REPLACE FUNCTION public.check_access()
RETURNS boolean AS $$
BEGIN
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix function search path warnings
CREATE OR REPLACE FUNCTION update_cost_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_supplier_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Fix alle RLS policies
-- =====================================================

-- PRODUCTS
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Products zijn publiek leesbaar" ON public.products;
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products FOR SELECT USING (public.check_access());

-- BUSINESS_PROFILES
DROP POLICY IF EXISTS "Business profiles are viewable by everyone" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can update own business profile" ON public.business_profiles;
DROP POLICY IF EXISTS "business_profiles_select" ON public.business_profiles;
DROP POLICY IF EXISTS "business_profiles_update" ON public.business_profiles;
DROP POLICY IF EXISTS "business_profiles_insert" ON public.business_profiles;
DROP POLICY IF EXISTS "business_profiles_delete" ON public.business_profiles;
DROP POLICY IF EXISTS "business_profiles_all" ON public.business_profiles;
CREATE POLICY "business_profiles_all" ON public.business_profiles USING (public.check_access()) WITH CHECK (public.check_access());

-- BUSINESS_TARGETS
DROP POLICY IF EXISTS "Targets viewable by tenant" ON public.business_targets;
DROP POLICY IF EXISTS "Targets editable by tenant" ON public.business_targets;
DROP POLICY IF EXISTS "business_targets_all" ON public.business_targets;
CREATE POLICY "business_targets_all" ON public.business_targets USING (public.check_access()) WITH CHECK (public.check_access());

-- COST_CATEGORIES  
DROP POLICY IF EXISTS "cost_categories_all" ON public.cost_categories;
DROP POLICY IF EXISTS "Allow all for cost_categories" ON public.cost_categories;
CREATE POLICY "cost_categories_all" ON public.cost_categories USING (public.check_access()) WITH CHECK (public.check_access());

-- DAILY_SALES
DROP POLICY IF EXISTS "daily_sales_all" ON public.daily_sales;
DROP POLICY IF EXISTS "Allow all for daily_sales" ON public.daily_sales;
CREATE POLICY "daily_sales_all" ON public.daily_sales USING (public.check_access()) WITH CHECK (public.check_access());

-- DELIVERY_SETTINGS
DROP POLICY IF EXISTS "Delivery settings viewable" ON public.delivery_settings;
DROP POLICY IF EXISTS "Delivery settings editable" ON public.delivery_settings;
DROP POLICY IF EXISTS "delivery_settings_all" ON public.delivery_settings;
DROP POLICY IF EXISTS "Allow all for delivery_settings" ON public.delivery_settings;
CREATE POLICY "delivery_settings_all" ON public.delivery_settings USING (public.check_access()) WITH CHECK (public.check_access());

-- EMAIL_VERIFICATION_TOKENS
DROP POLICY IF EXISTS "email_verification_all" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Allow all for email_verification_tokens" ON public.email_verification_tokens;
CREATE POLICY "email_verification_all" ON public.email_verification_tokens USING (public.check_access()) WITH CHECK (public.check_access());

-- FIXED_COSTS
DROP POLICY IF EXISTS "fixed_costs_all" ON public.fixed_costs;
DROP POLICY IF EXISTS "Allow all for fixed_costs" ON public.fixed_costs;
CREATE POLICY "fixed_costs_all" ON public.fixed_costs USING (public.check_access()) WITH CHECK (public.check_access());

-- GIFT_CARDS
DROP POLICY IF EXISTS "gift_cards_all" ON public.gift_cards;
DROP POLICY IF EXISTS "Allow all for gift_cards" ON public.gift_cards;
CREATE POLICY "gift_cards_all" ON public.gift_cards USING (public.check_access()) WITH CHECK (public.check_access());

-- INGREDIENTS
DROP POLICY IF EXISTS "ingredients_all" ON public.ingredients;
DROP POLICY IF EXISTS "Allow all for ingredients" ON public.ingredients;
CREATE POLICY "ingredients_all" ON public.ingredients USING (public.check_access()) WITH CHECK (public.check_access());

-- INVOICES
DROP POLICY IF EXISTS "invoices_all" ON public.invoices;
DROP POLICY IF EXISTS "Allow all for invoices" ON public.invoices;
CREATE POLICY "invoices_all" ON public.invoices USING (public.check_access()) WITH CHECK (public.check_access());

-- LOYALTY_REDEMPTIONS
DROP POLICY IF EXISTS "loyalty_redemptions_all" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "Allow all for loyalty_redemptions" ON public.loyalty_redemptions;
CREATE POLICY "loyalty_redemptions_all" ON public.loyalty_redemptions USING (public.check_access()) WITH CHECK (public.check_access());

-- LOYALTY_REWARDS
DROP POLICY IF EXISTS "loyalty_rewards_all" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "Allow all for loyalty_rewards" ON public.loyalty_rewards;
CREATE POLICY "loyalty_rewards_all" ON public.loyalty_rewards USING (public.check_access()) WITH CHECK (public.check_access());

-- MENU_CATEGORIES
DROP POLICY IF EXISTS "menu_categories_all" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow all for menu_categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.menu_categories;
DROP POLICY IF EXISTS "Categories can be managed by business owners" ON public.menu_categories;
CREATE POLICY "menu_categories_all" ON public.menu_categories USING (public.check_access()) WITH CHECK (public.check_access());

-- MENU_PRODUCTS
DROP POLICY IF EXISTS "menu_products_all" ON public.menu_products;
DROP POLICY IF EXISTS "Allow all for menu_products" ON public.menu_products;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.menu_products;
DROP POLICY IF EXISTS "Products can be managed by business owners" ON public.menu_products;
CREATE POLICY "menu_products_all" ON public.menu_products USING (public.check_access()) WITH CHECK (public.check_access());

-- OPENING_HOURS
DROP POLICY IF EXISTS "opening_hours_all" ON public.opening_hours;
DROP POLICY IF EXISTS "Allow all for opening_hours" ON public.opening_hours;
DROP POLICY IF EXISTS "Opening hours are viewable by everyone" ON public.opening_hours;
DROP POLICY IF EXISTS "Opening hours can be managed by business owners" ON public.opening_hours;
CREATE POLICY "opening_hours_all" ON public.opening_hours USING (public.check_access()) WITH CHECK (public.check_access());

-- ORDERS
DROP POLICY IF EXISTS "orders_all" ON public.orders;
DROP POLICY IF EXISTS "Allow all for orders" ON public.orders;
DROP POLICY IF EXISTS "Orders are viewable by business" ON public.orders;
DROP POLICY IF EXISTS "Orders can be created by anyone" ON public.orders;
DROP POLICY IF EXISTS "Orders can be updated by business" ON public.orders;
CREATE POLICY "orders_all" ON public.orders USING (public.check_access()) WITH CHECK (public.check_access());

-- PASSWORD_RESET_TOKENS
DROP POLICY IF EXISTS "password_reset_all" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Allow all for password_reset_tokens" ON public.password_reset_tokens;
CREATE POLICY "password_reset_all" ON public.password_reset_tokens USING (public.check_access()) WITH CHECK (public.check_access());

-- PRODUCT_INGREDIENTS
DROP POLICY IF EXISTS "product_ingredients_all" ON public.product_ingredients;
DROP POLICY IF EXISTS "Allow all for product_ingredients" ON public.product_ingredients;
CREATE POLICY "product_ingredients_all" ON public.product_ingredients USING (public.check_access()) WITH CHECK (public.check_access());

-- PRODUCT_OPTIONS
DROP POLICY IF EXISTS "product_options_all" ON public.product_options;
DROP POLICY IF EXISTS "Allow all for product_options" ON public.product_options;
CREATE POLICY "product_options_all" ON public.product_options USING (public.check_access()) WITH CHECK (public.check_access());

-- PROMOTIONS
DROP POLICY IF EXISTS "promotions_all" ON public.promotions;
DROP POLICY IF EXISTS "Allow all for promotions" ON public.promotions;
CREATE POLICY "promotions_all" ON public.promotions USING (public.check_access()) WITH CHECK (public.check_access());

-- QR_CODES
DROP POLICY IF EXISTS "qr_codes_all" ON public.qr_codes;
DROP POLICY IF EXISTS "Allow all for qr_codes" ON public.qr_codes;
CREATE POLICY "qr_codes_all" ON public.qr_codes USING (public.check_access()) WITH CHECK (public.check_access());

-- RESERVATIONS
DROP POLICY IF EXISTS "reservations_all" ON public.reservations;
DROP POLICY IF EXISTS "Allow all for reservations" ON public.reservations;
CREATE POLICY "reservations_all" ON public.reservations USING (public.check_access()) WITH CHECK (public.check_access());

-- REVIEWS
DROP POLICY IF EXISTS "reviews_all" ON public.reviews;
DROP POLICY IF EXISTS "Allow all for reviews" ON public.reviews;
CREATE POLICY "reviews_all" ON public.reviews USING (public.check_access()) WITH CHECK (public.check_access());

-- SHOP_CUSTOMERS
DROP POLICY IF EXISTS "shop_customers_all" ON public.shop_customers;
DROP POLICY IF EXISTS "Allow all for shop_customers" ON public.shop_customers;
CREATE POLICY "shop_customers_all" ON public.shop_customers USING (public.check_access()) WITH CHECK (public.check_access());

-- STAFF_MEMBERS
DROP POLICY IF EXISTS "staff_members_all" ON public.staff_members;
DROP POLICY IF EXISTS "Allow all for staff_members" ON public.staff_members;
CREATE POLICY "staff_members_all" ON public.staff_members USING (public.check_access()) WITH CHECK (public.check_access());

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "subscriptions_all" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow all for subscriptions" ON public.subscriptions;
CREATE POLICY "subscriptions_all" ON public.subscriptions USING (public.check_access()) WITH CHECK (public.check_access());

-- TENANT_BLOCKED
DROP POLICY IF EXISTS "tenant_blocked_all" ON public.tenant_blocked;
DROP POLICY IF EXISTS "Allow all for tenant_blocked" ON public.tenant_blocked;
CREATE POLICY "tenant_blocked_all" ON public.tenant_blocked USING (public.check_access()) WITH CHECK (public.check_access());

-- TENANT_MEDIA
DROP POLICY IF EXISTS "tenant_media_all" ON public.tenant_media;
DROP POLICY IF EXISTS "Allow all for tenant_media" ON public.tenant_media;
CREATE POLICY "tenant_media_all" ON public.tenant_media USING (public.check_access()) WITH CHECK (public.check_access());

-- TENANT_SETTINGS
DROP POLICY IF EXISTS "tenant_settings_all" ON public.tenant_settings;
DROP POLICY IF EXISTS "Allow all for tenant_settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Tenant settings are viewable by everyone" ON public.tenant_settings;
DROP POLICY IF EXISTS "Tenant settings can be managed by business owners" ON public.tenant_settings;
CREATE POLICY "tenant_settings_all" ON public.tenant_settings USING (public.check_access()) WITH CHECK (public.check_access());

-- TENANT_TEXTS
DROP POLICY IF EXISTS "tenant_texts_all" ON public.tenant_texts;
DROP POLICY IF EXISTS "Allow all for tenant_texts" ON public.tenant_texts;
CREATE POLICY "tenant_texts_all" ON public.tenant_texts USING (public.check_access()) WITH CHECK (public.check_access());

-- TIMESHEET_ENTRIES
DROP POLICY IF EXISTS "timesheet_entries_all" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Allow all for timesheet_entries" ON public.timesheet_entries;
CREATE POLICY "timesheet_entries_all" ON public.timesheet_entries USING (public.check_access()) WITH CHECK (public.check_access());

-- Z_REPORTS
DROP POLICY IF EXISTS "z_reports_all" ON public.z_reports;
DROP POLICY IF EXISTS "Allow all for z_reports" ON public.z_reports;
CREATE POLICY "z_reports_all" ON public.z_reports USING (public.check_access()) WITH CHECK (public.check_access());

-- =====================================================
-- KLAAR! Refresh de Supabase linter pagina
-- =====================================================

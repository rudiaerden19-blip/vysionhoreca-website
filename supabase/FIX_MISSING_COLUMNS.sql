-- ============================================================
-- FIX ONTBREKENDE KOLOMMEN IN BESTAANDE TABELLEN
-- Kopieer ALLES en plak in Supabase SQL Editor, klik RUN
-- ============================================================

-- TENANT_MEDIA - Fix ontbrekende kolommen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_media' AND column_name = 'url') THEN
    ALTER TABLE tenant_media ADD COLUMN url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_media' AND column_name = 'tenant_slug') THEN
    ALTER TABLE tenant_media ADD COLUMN tenant_slug VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_media' AND column_name = 'name') THEN
    ALTER TABLE tenant_media ADD COLUMN name VARCHAR(255) DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_media' AND column_name = 'size') THEN
    ALTER TABLE tenant_media ADD COLUMN size INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_media' AND column_name = 'type') THEN
    ALTER TABLE tenant_media ADD COLUMN type VARCHAR(50) DEFAULT 'image';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_media' AND column_name = 'category') THEN
    ALTER TABLE tenant_media ADD COLUMN category VARCHAR(255) DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_media' AND column_name = 'created_at') THEN
    ALTER TABLE tenant_media ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- TENANT_SETTINGS - Fix ontbrekende kolommen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'tagline') THEN
    ALTER TABLE tenant_settings ADD COLUMN tagline TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'postal_code') THEN
    ALTER TABLE tenant_settings ADD COLUMN postal_code VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'city') THEN
    ALTER TABLE tenant_settings ADD COLUMN city VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'country') THEN
    ALTER TABLE tenant_settings ADD COLUMN country VARCHAR(50) DEFAULT 'NL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'btw_number') THEN
    ALTER TABLE tenant_settings ADD COLUMN btw_number VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'kvk_number') THEN
    ALTER TABLE tenant_settings ADD COLUMN kvk_number VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'btw_percentage') THEN
    ALTER TABLE tenant_settings ADD COLUMN btw_percentage INTEGER DEFAULT 21;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'specialty_1_image') THEN
    ALTER TABLE tenant_settings ADD COLUMN specialty_1_image TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'specialty_1_title') THEN
    ALTER TABLE tenant_settings ADD COLUMN specialty_1_title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'specialty_2_image') THEN
    ALTER TABLE tenant_settings ADD COLUMN specialty_2_image TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'specialty_2_title') THEN
    ALTER TABLE tenant_settings ADD COLUMN specialty_2_title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'specialty_3_image') THEN
    ALTER TABLE tenant_settings ADD COLUMN specialty_3_image TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'specialty_3_title') THEN
    ALTER TABLE tenant_settings ADD COLUMN specialty_3_title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'show_qr_codes') THEN
    ALTER TABLE tenant_settings ADD COLUMN show_qr_codes BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'hiring_enabled') THEN
    ALTER TABLE tenant_settings ADD COLUMN hiring_enabled BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'hiring_title') THEN
    ALTER TABLE tenant_settings ADD COLUMN hiring_title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'hiring_description') THEN
    ALTER TABLE tenant_settings ADD COLUMN hiring_description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'hiring_contact') THEN
    ALTER TABLE tenant_settings ADD COLUMN hiring_contact TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'stripe_secret_key') THEN
    ALTER TABLE tenant_settings ADD COLUMN stripe_secret_key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'stripe_public_key') THEN
    ALTER TABLE tenant_settings ADD COLUMN stripe_public_key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'gift_cards_enabled') THEN
    ALTER TABLE tenant_settings ADD COLUMN gift_cards_enabled BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'about_image') THEN
    ALTER TABLE tenant_settings ADD COLUMN about_image TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'top_seller_1') THEN
    ALTER TABLE tenant_settings ADD COLUMN top_seller_1 TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'top_seller_2') THEN
    ALTER TABLE tenant_settings ADD COLUMN top_seller_2 TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'top_seller_3') THEN
    ALTER TABLE tenant_settings ADD COLUMN top_seller_3 TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'cover_image_1') THEN
    ALTER TABLE tenant_settings ADD COLUMN cover_image_1 TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'cover_image_2') THEN
    ALTER TABLE tenant_settings ADD COLUMN cover_image_2 TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'cover_image_3') THEN
    ALTER TABLE tenant_settings ADD COLUMN cover_image_3 TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'seo_title') THEN
    ALTER TABLE tenant_settings ADD COLUMN seo_title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'seo_description') THEN
    ALTER TABLE tenant_settings ADD COLUMN seo_description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'seo_keywords') THEN
    ALTER TABLE tenant_settings ADD COLUMN seo_keywords TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'seo_og_image') THEN
    ALTER TABLE tenant_settings ADD COLUMN seo_og_image TEXT;
  END IF;
END $$;

-- MENU_PRODUCTS - Fix ontbrekende kolommen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_products' AND column_name = 'is_promo') THEN
    ALTER TABLE menu_products ADD COLUMN is_promo BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_products' AND column_name = 'promo_price') THEN
    ALTER TABLE menu_products ADD COLUMN promo_price DECIMAL(10,2);
  END IF;
END $$;

-- ORDERS - Fix ontbrekende kolommen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'confirmed_at') THEN
    ALTER TABLE orders ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'rejected_at') THEN
    ALTER TABLE orders ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'rejection_reason') THEN
    ALTER TABLE orders ADD COLUMN rejection_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'rejection_notes') THEN
    ALTER TABLE orders ADD COLUMN rejection_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'items') THEN
    ALTER TABLE orders ADD COLUMN items JSONB DEFAULT '[]';
  END IF;
END $$;

-- TENANTS - Fix ontbrekende kolommen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'is_blocked') THEN
    ALTER TABLE tenants ADD COLUMN is_blocked BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'blocked_reason') THEN
    ALTER TABLE tenants ADD COLUMN blocked_reason TEXT;
  END IF;
END $$;

-- SUBSCRIPTIONS - Fix ontbrekende kolommen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE subscriptions ADD COLUMN stripe_customer_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id TEXT;
  END IF;
END $$;

-- REVIEWS - Fix ontbrekende kolommen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'reply') THEN
    ALTER TABLE reviews ADD COLUMN reply TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'replied_at') THEN
    ALTER TABLE reviews ADD COLUMN replied_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Maak indexen aan als ze niet bestaan
CREATE INDEX IF NOT EXISTS idx_tenant_media_tenant ON tenant_media(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_tenant_media_category ON tenant_media(category);

-- Fix RLS policies
ALTER TABLE tenant_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON tenant_media;
CREATE POLICY "Allow all" ON tenant_media FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- KLAAR! Alle ontbrekende kolommen zijn toegevoegd.
-- ============================================================
SELECT 'SUCCESS: Alle kolommen toegevoegd!' as status;

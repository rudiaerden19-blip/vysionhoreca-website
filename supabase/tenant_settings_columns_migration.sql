-- ============================================================
-- VOLLEDIGE TENANT_SETTINGS MIGRATIE
-- Kopieer ALLES en plak in Supabase SQL Editor, klik RUN
-- ============================================================

-- Basis kolommen
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#FF6B35';
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#1a1a2e';

-- Contact kolommen
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'NL';
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS website TEXT;

-- Bedrijfsgegevens (kassabon)
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS btw_number TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS kvk_number TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS btw_percentage INTEGER DEFAULT 21;

-- Social media
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Foto's
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS about_image TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS top_seller_1 TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS top_seller_2 TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS top_seller_3 TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS cover_image_1 TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS cover_image_2 TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS cover_image_3 TEXT;

-- SEO
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS seo_og_image TEXT;

-- Specialiteiten
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS specialty_1_image TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS specialty_1_title TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS specialty_2_image TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS specialty_2_title TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS specialty_3_image TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS specialty_3_title TEXT;

-- QR codes toggle
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS show_qr_codes BOOLEAN DEFAULT true;

-- Vacatures/hiring
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS hiring_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS hiring_title TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS hiring_description TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS hiring_contact TEXT;

-- Stripe & cadeaubonnen
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS stripe_public_key TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS gift_cards_enabled BOOLEAN DEFAULT false;

-- Reserveringen & promoties aan/uit
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS reservations_enabled BOOLEAN DEFAULT true;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS promotions_enabled BOOLEAN DEFAULT true;

-- ============================================================
-- KLAAR! Alle kolommen zijn toegevoegd.
-- ============================================================

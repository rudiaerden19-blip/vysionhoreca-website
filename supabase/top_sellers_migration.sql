-- =====================================================
-- VYSION HORECA - Extra Fields Migration
-- Voer dit uit in je Supabase SQL Editor
-- =====================================================

-- Voeg top seller foto velden toe aan tenant_settings
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS top_seller_1 TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS top_seller_2 TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS top_seller_3 TEXT DEFAULT '';

-- Voeg tagline toe (korte tekst voor header/footer)
-- Description blijft voor "Over Ons" sectie
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT '';

-- Voeg about_image toe (foto naast "Over Ons")
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS about_image TEXT DEFAULT '';

-- Voeg cover images toe (3 header foto's)
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS cover_image_1 TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS cover_image_2 TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS cover_image_3 TEXT DEFAULT '';

-- Klaar!

-- =====================================================
-- VYSION HORECA - Top Sellers Migration
-- Voer dit uit in je Supabase SQL Editor
-- =====================================================

-- Voeg top seller foto velden toe aan tenant_settings
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS top_seller_1 TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS top_seller_2 TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS top_seller_3 TEXT DEFAULT '';

-- Klaar! Nu kan de klant 3 foto's uploaden voor topverkopers.

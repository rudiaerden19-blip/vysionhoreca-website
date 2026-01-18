-- =====================================================
-- RESERVATIONS ENABLED - Voeg dit veld toe aan tenant_settings
-- Voer dit uit in Supabase SQL Editor
-- =====================================================

-- Voeg reservations_enabled kolom toe (default true)
ALTER TABLE tenant_settings 
  ADD COLUMN IF NOT EXISTS reservations_enabled BOOLEAN DEFAULT true;

-- Update bestaande tenants naar enabled
UPDATE tenant_settings SET reservations_enabled = true WHERE reservations_enabled IS NULL;

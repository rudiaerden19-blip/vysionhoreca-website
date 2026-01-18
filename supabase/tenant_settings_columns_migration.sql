-- Migration: Add missing columns to tenant_settings table
-- Run this in Supabase SQL Editor

-- Add tagline column
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Add postal_code column
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Add city column
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add country column
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'NL';

-- Add BTW/KvK columns for receipt
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS btw_number TEXT;

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS kvk_number TEXT;

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS btw_percentage INTEGER DEFAULT 21;

-- Add specialty columns
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS specialty_1_image TEXT;

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS specialty_1_title TEXT;

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS specialty_2_image TEXT;

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS specialty_2_title TEXT;

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS specialty_3_image TEXT;

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS specialty_3_title TEXT;

-- Add QR codes toggle
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS show_qr_codes BOOLEAN DEFAULT true;

-- Add hiring/vacature section
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS hiring_enabled BOOLEAN DEFAULT false;

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS hiring_title TEXT;

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS hiring_description TEXT;

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS hiring_contact TEXT;

-- Add Stripe & gift cards
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT;

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS stripe_public_key TEXT;

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS gift_cards_enabled BOOLEAN DEFAULT false;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenant_settings'
ORDER BY ordinal_position;

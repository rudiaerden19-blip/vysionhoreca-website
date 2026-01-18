-- Migration: Add hiring/vacature section fields to tenant_settings
-- Run this in Supabase SQL Editor

ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS hiring_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hiring_title TEXT DEFAULT 'Wij zoeken personeel',
ADD COLUMN IF NOT EXISTS hiring_description TEXT,
ADD COLUMN IF NOT EXISTS hiring_contact TEXT;

-- Add comment for documentation
COMMENT ON COLUMN tenant_settings.hiring_enabled IS 'Enable/disable the hiring section on the shop page';
COMMENT ON COLUMN tenant_settings.hiring_title IS 'Title for the hiring section (e.g., Wij zoeken personeel, Vacatures)';
COMMENT ON COLUMN tenant_settings.hiring_description IS 'Description of what positions are available';
COMMENT ON COLUMN tenant_settings.hiring_contact IS 'Contact email or phone for job applications';

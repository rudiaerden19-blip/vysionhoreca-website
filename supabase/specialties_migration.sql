-- SPECIALITEITEN - 3 items op de homepage
-- Voer dit uit in Supabase SQL Editor

ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS specialty_1_image VARCHAR(500);
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS specialty_1_title VARCHAR(255);
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS specialty_2_image VARCHAR(500);
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS specialty_2_title VARCHAR(255);
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS specialty_3_image VARCHAR(500);
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS specialty_3_title VARCHAR(255);

-- ============================================================
-- EMAIL SMTP INSTELLINGEN PER TENANT
-- Voer uit in Supabase SQL Editor
-- ============================================================

ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS smtp_host TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 465;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS smtp_user TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS smtp_password TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS smtp_from_name TEXT;

-- ============================================================
-- KLAAR! Tenants kunnen nu hun eigen email instellen.
-- ============================================================

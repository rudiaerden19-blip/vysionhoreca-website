-- Voeg is_blocked kolom toe aan tenant_settings
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

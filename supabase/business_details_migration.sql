-- Bedrijfsgegevens toevoegen aan tenant_settings
-- Voor kassabon en wettelijke vereisten

ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS city VARCHAR(255),
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'België',
ADD COLUMN IF NOT EXISTS btw_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS kvk_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- Index voor snellere lookups
CREATE INDEX IF NOT EXISTS idx_tenant_settings_btw ON tenant_settings(btw_number);

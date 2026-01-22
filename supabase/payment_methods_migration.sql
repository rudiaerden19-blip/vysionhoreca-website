-- Voeg payment_methods toe aan tenant_settings
-- Dit slaat de geaccepteerde betaalmethodes op als JSON array

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '["cash", "bancontact"]'::jsonb;

-- Zorg dat btw_percentage bestaat
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS btw_percentage INTEGER DEFAULT 6;

COMMENT ON COLUMN tenant_settings.payment_methods IS 'Array van geaccepteerde betaalmethodes: cash, bancontact, visa, mastercard, paypal, ideal';

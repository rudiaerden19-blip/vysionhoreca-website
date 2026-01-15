-- SEO velden toevoegen aan tenant_settings
-- Voer dit uit in Supabase SQL Editor

-- SEO velden toevoegen
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS seo_keywords TEXT,
ADD COLUMN IF NOT EXISTS seo_og_image TEXT;

-- Commentaar toevoegen voor documentatie
COMMENT ON COLUMN tenant_settings.seo_title IS 'SEO pagina titel voor zoekresultaten';
COMMENT ON COLUMN tenant_settings.seo_description IS 'SEO meta beschrijving voor zoekresultaten';
COMMENT ON COLUMN tenant_settings.seo_keywords IS 'SEO zoekwoorden, gescheiden door kommas';
COMMENT ON COLUMN tenant_settings.seo_og_image IS 'Open Graph afbeelding URL voor social media';

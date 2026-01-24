-- Image display modes per sectie
-- NULL of 'cover' = foto vult volledig (kan bijsnijden)
-- 'contain' = volledige foto zichtbaar

-- Voeg display mode kolommen toe aan tenant_settings
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS hero_image_display VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS about_image_display VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS specialty_image_display VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS topseller_image_display VARCHAR(20) DEFAULT NULL;

COMMENT ON COLUMN tenant_settings.hero_image_display IS 'Display mode voor hero slider: NULL/cover = vullend, contain = volledig';
COMMENT ON COLUMN tenant_settings.about_image_display IS 'Display mode voor over ons foto: NULL/cover = vullend, contain = volledig';
COMMENT ON COLUMN tenant_settings.specialty_image_display IS 'Display mode voor specialiteiten: NULL/cover = vullend, contain = volledig';
COMMENT ON COLUMN tenant_settings.topseller_image_display IS 'Display mode voor top sellers: NULL/cover = vullend, contain = volledig';

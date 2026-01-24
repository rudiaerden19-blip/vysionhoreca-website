-- Image display modes per sectie
-- cover = foto vult volledig (kan afsnijden)
-- contain = volledige foto zichtbaar (kan witruimte hebben)
-- fill = foto uitrekken om te vullen

-- Voeg display mode kolommen toe aan tenant_settings
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS hero_image_display VARCHAR(20) DEFAULT 'cover',
ADD COLUMN IF NOT EXISTS about_image_display VARCHAR(20) DEFAULT 'cover',
ADD COLUMN IF NOT EXISTS specialty_image_display VARCHAR(20) DEFAULT 'cover',
ADD COLUMN IF NOT EXISTS topseller_image_display VARCHAR(20) DEFAULT 'cover';

COMMENT ON COLUMN tenant_settings.hero_image_display IS 'Display mode voor hero slider: cover, contain, fill';
COMMENT ON COLUMN tenant_settings.about_image_display IS 'Display mode voor over ons foto: cover, contain, fill';
COMMENT ON COLUMN tenant_settings.specialty_image_display IS 'Display mode voor specialiteiten: cover, contain, fill';
COMMENT ON COLUMN tenant_settings.topseller_image_display IS 'Display mode voor top sellers: cover, contain, fill';

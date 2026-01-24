-- Image zoom levels per sectie
-- Waarde is een percentage: 50-150 (default 100)
-- 50 = uitgezoomd (meer van foto zichtbaar)
-- 100 = normaal
-- 150 = ingezoomd (dichter bij foto)

-- Voeg zoom level kolommen toe aan tenant_settings
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS hero_image_display VARCHAR(10) DEFAULT '100',
ADD COLUMN IF NOT EXISTS about_image_display VARCHAR(10) DEFAULT '100',
ADD COLUMN IF NOT EXISTS specialty_image_display VARCHAR(10) DEFAULT '100',
ADD COLUMN IF NOT EXISTS topseller_image_display VARCHAR(10) DEFAULT '100';

COMMENT ON COLUMN tenant_settings.hero_image_display IS 'Zoom level voor hero slider: 50-150 (percentage)';
COMMENT ON COLUMN tenant_settings.about_image_display IS 'Zoom level voor over ons foto: 50-150 (percentage)';
COMMENT ON COLUMN tenant_settings.specialty_image_display IS 'Zoom level voor specialiteiten: 50-150 (percentage)';
COMMENT ON COLUMN tenant_settings.topseller_image_display IS 'Zoom level voor top sellers: 50-150 (percentage)';

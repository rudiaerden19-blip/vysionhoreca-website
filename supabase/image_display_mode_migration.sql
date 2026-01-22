-- Add image_display_mode column to tenant_settings
-- This allows tenants to choose between 'cover' (fills space) or 'contain' (shows full product)

ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS image_display_mode VARCHAR(10) DEFAULT 'cover';

-- Add comment for documentation
COMMENT ON COLUMN tenant_settings.image_display_mode IS 'Product image display mode: cover (fills space, may crop) or contain (shows full product)';

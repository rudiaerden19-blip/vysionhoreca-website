-- =====================================================
-- VOEG tenant_slug TOE AAN business_profiles
-- =====================================================
-- Dit koppelt business accounts direct aan hun tenant
-- Voer uit in Supabase SQL Editor
-- =====================================================

-- Stap 1: Voeg tenant_slug kolom toe
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(255);

-- Stap 2: Maak index voor snelle lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_tenant_slug 
ON business_profiles(tenant_slug);

-- Stap 3: Update bestaande records - koppel via email
UPDATE business_profiles bp
SET tenant_slug = ts.tenant_slug
FROM tenant_settings ts
WHERE LOWER(bp.email) = LOWER(ts.email)
AND bp.tenant_slug IS NULL;

-- Stap 4: Maak tenant_slug UNIQUE (optioneel, 1 account per tenant)
-- ALTER TABLE business_profiles ADD CONSTRAINT business_profiles_tenant_slug_unique UNIQUE (tenant_slug);

-- Klaar!
SELECT 
  'tenant_slug kolom toegevoegd!' as status,
  COUNT(*) as "Accounts bijgewerkt"
FROM business_profiles 
WHERE tenant_slug IS NOT NULL;

-- =====================================================
-- VYSION HORECA - Tenant Media Tabel
-- Voer dit uit in je Supabase SQL Editor
-- =====================================================

-- TENANT MEDIA - Geüploade foto's per tenant
-- Ondersteunt 500+ tenants met juiste indexering
CREATE TABLE IF NOT EXISTS tenant_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,                          -- Primaire kolom voor URL
  url TEXT,                                         -- Backwards compatibility alias
  file_name VARCHAR(255) DEFAULT '',               -- Originele bestandsnaam
  name VARCHAR(255) DEFAULT '',                    -- Display naam
  size INTEGER DEFAULT 0,
  type VARCHAR(50) DEFAULT 'image',
  category VARCHAR(255) DEFAULT '',                -- Voor mappen/categorieën
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexen voor snelle queries over 500+ tenants
CREATE INDEX IF NOT EXISTS idx_tenant_media_tenant ON tenant_media(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_tenant_media_category ON tenant_media(tenant_slug, category);
CREATE INDEX IF NOT EXISTS idx_tenant_media_created ON tenant_media(tenant_slug, created_at DESC);

-- Enable RLS
ALTER TABLE tenant_media ENABLE ROW LEVEL SECURITY;

-- Drop oude policies eerst (voorkomt fouten bij opnieuw uitvoeren)
DROP POLICY IF EXISTS "Public read tenant_media" ON tenant_media;
DROP POLICY IF EXISTS "Auth manage tenant_media" ON tenant_media;

-- Public kan media lezen
CREATE POLICY "Public read tenant_media" ON tenant_media FOR SELECT USING (true);

-- Authenticated kan media beheren
CREATE POLICY "Auth manage tenant_media" ON tenant_media FOR ALL USING (true);

-- ===========================================
-- MIGRATIE voor bestaande tabellen:
-- Voer onderstaande uit als je tabel al bestaat
-- ===========================================

-- Voeg file_url kolom toe als die nog niet bestaat
-- ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Kopieer url naar file_url voor bestaande records
-- UPDATE tenant_media SET file_url = url WHERE file_url IS NULL AND url IS NOT NULL;

-- Voeg file_name kolom toe
-- ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) DEFAULT '';

-- Voeg category kolom toe
-- ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT '';

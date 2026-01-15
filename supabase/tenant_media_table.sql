-- =====================================================
-- VYSION HORECA - Tenant Media Tabel
-- Voer dit uit in je Supabase SQL Editor
-- =====================================================

-- TENANT MEDIA - Geüploade foto's per tenant
CREATE TABLE IF NOT EXISTS tenant_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  name VARCHAR(255) DEFAULT '',
  size INTEGER DEFAULT 0,
  type VARCHAR(50) DEFAULT 'image',
  category VARCHAR(255) DEFAULT '',  -- Voor mappen/categorieën
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index voor snelle queries
CREATE INDEX IF NOT EXISTS idx_tenant_media_tenant ON tenant_media(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_tenant_media_category ON tenant_media(category);

-- Enable RLS
ALTER TABLE tenant_media ENABLE ROW LEVEL SECURITY;

-- Public kan media lezen
CREATE POLICY "Public read tenant_media" ON tenant_media FOR SELECT USING (true);

-- Authenticated kan media beheren
CREATE POLICY "Auth manage tenant_media" ON tenant_media FOR ALL USING (true);

-- Als tabel al bestaat, voeg category kolom toe:
-- ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT '';

-- =====================================================
-- FIX TENANT MEDIA TABLE
-- Voer dit uit in Supabase SQL Editor om de media tabel te fixen
-- =====================================================

-- Stap 1: Voeg file_url kolom toe als die niet bestaat
ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Stap 2: Voeg url kolom toe als die niet bestaat (voor backwards compatibility)
ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS url TEXT;

-- Stap 3: Voeg file_name kolom toe als die niet bestaat
ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) DEFAULT '';

-- Stap 4: Voeg name kolom toe als die niet bestaat
ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT '';

-- Stap 5: Voeg category kolom toe als die niet bestaat
ALTER TABLE tenant_media ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT '';

-- Stap 6: Kopieer url naar file_url voor bestaande records (als url gevuld is maar file_url niet)
UPDATE tenant_media 
SET file_url = url 
WHERE file_url IS NULL AND url IS NOT NULL;

-- Stap 7: Kopieer file_url naar url voor bestaande records (als file_url gevuld is maar url niet)
UPDATE tenant_media 
SET url = file_url 
WHERE url IS NULL AND file_url IS NOT NULL;

-- Stap 8: Fix de NOT NULL constraint - maak file_url nullable als er oude records zijn
-- Dit voorkomt errors bij insert
ALTER TABLE tenant_media ALTER COLUMN file_url DROP NOT NULL;

-- Stap 9: Indexen voor performance over 500+ tenants
CREATE INDEX IF NOT EXISTS idx_tenant_media_tenant ON tenant_media(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_tenant_media_category ON tenant_media(tenant_slug, category);
CREATE INDEX IF NOT EXISTS idx_tenant_media_created ON tenant_media(tenant_slug, created_at DESC);

-- Stap 10: RLS policies
DROP POLICY IF EXISTS "Public read tenant_media" ON tenant_media;
DROP POLICY IF EXISTS "Auth manage tenant_media" ON tenant_media;

CREATE POLICY "Public read tenant_media" ON tenant_media FOR SELECT USING (true);
CREATE POLICY "Auth manage tenant_media" ON tenant_media FOR ALL USING (true);

-- Controleer het resultaat:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'tenant_media';

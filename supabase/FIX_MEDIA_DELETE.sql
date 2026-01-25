-- Fix tenant_media DELETE policy
-- Voer dit uit in Supabase SQL Editor

-- Verwijder alle oude policies
DROP POLICY IF EXISTS "tenant_media_all" ON tenant_media;
DROP POLICY IF EXISTS "tenant_media_select" ON tenant_media;
DROP POLICY IF EXISTS "Public read tenant_media" ON tenant_media;
DROP POLICY IF EXISTS "Auth manage tenant_media" ON tenant_media;
DROP POLICY IF EXISTS "Allow all on tenant_media" ON tenant_media;
DROP POLICY IF EXISTS "Allow all" ON tenant_media;

-- Maak één policy die ALLES toestaat (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "tenant_media_full_access" ON tenant_media
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'tenant_media';

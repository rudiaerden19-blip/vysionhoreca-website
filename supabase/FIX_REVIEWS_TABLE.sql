-- =====================================================
-- FIX REVIEWS TABLE - Voeg ontbrekende kolommen toe
-- Voer dit uit in Supabase SQL Editor
-- =====================================================

-- Stap 1: Voeg is_visible kolom toe
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT false;

-- Stap 2: Voeg is_verified kolom toe
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Stap 3: Voeg reply kolom toe
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply TEXT;

-- Stap 4: Voeg replied_at kolom toe
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE;

-- Stap 5: Voeg order_id kolom toe
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id UUID;

-- Stap 6: Voeg updated_at kolom toe
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Stap 7: Indexen voor performance
CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON reviews(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON reviews(tenant_slug, is_visible);

-- Stap 8: RLS policies (drop eerst bestaande)
DROP POLICY IF EXISTS "Allow read access to reviews" ON reviews;
DROP POLICY IF EXISTS "Allow insert to reviews" ON reviews;
DROP POLICY IF EXISTS "Allow update to reviews" ON reviews;
DROP POLICY IF EXISTS "Allow delete from reviews" ON reviews;

-- Maak nieuwe policies
CREATE POLICY "Allow read access to reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Allow insert to reviews" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update to reviews" ON reviews FOR UPDATE USING (true);
CREATE POLICY "Allow delete from reviews" ON reviews FOR DELETE USING (true);

-- Klaar! Reviews werkt nu voor alle tenants

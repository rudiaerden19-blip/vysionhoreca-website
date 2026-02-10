-- Reset analytics en voeg visitor_hash kolom toe
-- Voer dit uit in Supabase SQL Editor

-- 1. Verwijder alle bestaande page views (reset teller naar 0)
DELETE FROM page_views;

-- 2. Voeg visitor_hash kolom toe voor deduplicatie
ALTER TABLE page_views 
ADD COLUMN IF NOT EXISTS visitor_hash TEXT;

-- 3. Maak index voor snelle lookups
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_hash 
ON page_views(visitor_hash);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at 
ON page_views(created_at);

-- Klaar! Nu worden alleen unieke bezoekers per dag geteld, zonder bots.

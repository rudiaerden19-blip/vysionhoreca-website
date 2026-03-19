-- =====================================================
-- KASSA RESERVATIONS MIGRATION
-- Voer dit uit in je Supabase SQL Editor
-- =====================================================

-- Voeg ontbrekende kolommen toe aan bestaande reservations tabel
ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS table_number VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0;

-- Status waarden uitgebreid: pending, confirmed, checked_in, completed, no_show, cancelled
-- Geen CHECK constraint dus werkt zonder verdere aanpassing

-- Index voor tafel queries
CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(tenant_slug, table_number);

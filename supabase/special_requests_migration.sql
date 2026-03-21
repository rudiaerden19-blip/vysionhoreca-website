-- =====================================================
-- SPECIAL REQUESTS MIGRATION
-- Voeg special_requests kolom toe aan reservations
-- =====================================================

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS special_requests TEXT DEFAULT '';

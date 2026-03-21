-- =====================================================
-- AUTO CONFIRM KOLOM voor reservation_settings
-- Voer uit in Supabase SQL Editor
-- =====================================================

ALTER TABLE reservation_settings
  ADD COLUMN IF NOT EXISTS auto_confirm BOOLEAN DEFAULT false;

SELECT 'SUCCESS: auto_confirm kolom toegevoegd!' AS status;

-- ================================================
-- OPENINGSTIJDEN: 2 SHIFTS PER DAG
-- Voer dit uit in Supabase SQL Editor
-- ================================================

-- Voeg nieuwe kolommen toe voor shift 2
ALTER TABLE opening_hours ADD COLUMN IF NOT EXISTS has_shift2 BOOLEAN DEFAULT false;
ALTER TABLE opening_hours ADD COLUMN IF NOT EXISTS open_time_2 VARCHAR(10);
ALTER TABLE opening_hours ADD COLUMN IF NOT EXISTS close_time_2 VARCHAR(10);

-- Migreer bestaande pauze data naar shift 2 formaat
-- (open-breakStart = shift1, breakEnd-close = shift2)
UPDATE opening_hours
SET 
  has_shift2 = true,
  open_time_2 = break_end,
  close_time_2 = close_time,
  close_time = break_start,
  has_break = false,
  break_start = NULL,
  break_end = NULL
WHERE has_break = true 
  AND break_start IS NOT NULL 
  AND break_end IS NOT NULL
  AND has_shift2 IS NOT true;

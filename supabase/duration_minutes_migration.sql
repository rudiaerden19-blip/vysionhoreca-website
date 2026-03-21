-- Voeg duration_minutes toe aan reservations tabel
ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 90;

-- Bestaande reservaties zonder duration_minutes krijgen standaard 90 minuten
UPDATE reservations SET duration_minutes = 90 WHERE duration_minutes IS NULL;

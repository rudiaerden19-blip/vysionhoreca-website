-- =====================================================
-- RESERVATIONS: voeg guest_name/phone/email kolommen toe
-- Voer dit uit in Supabase SQL Editor
-- =====================================================

-- Voeg guest_name, guest_phone, guest_email toe als ze nog niet bestaan
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);

-- Kopieer bestaande customer_* data naar guest_* kolommen
UPDATE reservations
SET
  guest_name  = COALESCE(guest_name,  customer_name),
  guest_phone = COALESCE(guest_phone, customer_phone),
  guest_email = COALESCE(guest_email, customer_email)
WHERE guest_name IS NULL OR guest_phone IS NULL;

-- Maak customer_name nullable (was NOT NULL in origineel schema)
ALTER TABLE reservations
  ALTER COLUMN customer_name DROP NOT NULL,
  ALTER COLUMN customer_phone DROP NOT NULL;

SELECT 'SUCCESS: guest_name/phone/email kolommen toegevoegd en gevuld!' AS status;

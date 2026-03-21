-- Voeg voorschot kolommen toe aan reservation_settings
ALTER TABLE reservation_settings
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show_protection BOOLEAN DEFAULT false;

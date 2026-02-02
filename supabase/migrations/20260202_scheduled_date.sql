-- Voeg scheduled_date en scheduled_time kolommen toe aan orders tabel
-- Voor bestellingen met specifieke afhaal/lever datum en tijd

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS scheduled_date DATE DEFAULT NULL;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS scheduled_time TEXT DEFAULT NULL;

-- Comments voor documentatie
COMMENT ON COLUMN orders.scheduled_date IS 'Datum waarvoor de bestelling gepland is';
COMMENT ON COLUMN orders.scheduled_time IS 'Gewenste afhaaltijd (bv. 14:30)';

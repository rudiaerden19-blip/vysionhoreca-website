-- Voeg last_order_time kolom toe aan opening_hours tabel
ALTER TABLE opening_hours 
ADD COLUMN IF NOT EXISTS last_order_time TEXT DEFAULT NULL;

-- Comment voor documentatie
COMMENT ON COLUMN opening_hours.last_order_time IS 'Laatste besteltijd - kan zijn: null (zelfde als close_time), "15min", "30min", "45min", "60min", of specifieke tijd zoals "19:30"';

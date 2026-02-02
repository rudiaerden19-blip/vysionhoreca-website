-- Voeg scheduled_date kolom toe aan orders tabel
-- Voor bestellingen die geplaatst worden wanneer de zaak gesloten is

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS scheduled_date DATE DEFAULT NULL;

-- Comment voor documentatie
COMMENT ON COLUMN orders.scheduled_date IS 'Datum waarvoor de bestelling gepland is (als klant bestelt wanneer zaak gesloten is)';

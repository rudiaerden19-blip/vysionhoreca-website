-- Z-Rapport: Handmatige kassa invoer kolommen
-- Eigenaar voert contant / kaart / online in na zijn shift

ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS manual_cash DECIMAL(10,2);
ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS manual_card DECIMAL(10,2);
ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS manual_online DECIMAL(10,2);
ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS manual_total DECIMAL(10,2);
ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS kassa_saved_at TIMESTAMPTZ;

COMMENT ON COLUMN z_reports.manual_cash IS 'Handmatig ingevoerd contant kassabedrag';
COMMENT ON COLUMN z_reports.manual_card IS 'Handmatig ingevoerd kaart kassabedrag';
COMMENT ON COLUMN z_reports.manual_online IS 'Handmatig ingevoerd online kassabedrag';
COMMENT ON COLUMN z_reports.manual_total IS 'Totaal handmatige kassa (cash + card + online)';
COMMENT ON COLUMN z_reports.kassa_saved_at IS 'Tijdstip van laatste kassa invoer';

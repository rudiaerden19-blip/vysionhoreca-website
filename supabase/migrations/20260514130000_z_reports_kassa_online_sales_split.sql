-- Z-rapport: splitsing omzet fysieke kassa (POS) vs webshop/online,
-- gelijk aan rapportage (`isKassaPosOrder`: DINE_IN, TAKEAWAY, DELIVERY).
-- NULL op bestaande rijen tot herberekening / nieuwe sync.

ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS kassa_sales_total DECIMAL(10, 2);
ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS online_sales_total DECIMAL(10, 2);
ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS kassa_order_count INTEGER;
ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS online_order_count INTEGER;

COMMENT ON COLUMN z_reports.kassa_sales_total IS 'Omzet POS-kassa (order_type DINE_IN, TAKEAWAY, DELIVERY); moet met online_sales_total samen total zijn.';
COMMENT ON COLUMN z_reports.online_sales_total IS 'Omzet webshop/overige kanalen (niet POS-kassa types).';
COMMENT ON COLUMN z_reports.kassa_order_count IS 'Aantal tellende POS-kassa bonnen op deze Z-dag.';
COMMENT ON COLUMN z_reports.online_order_count IS 'Aantal tellende online/webshop bonnen op deze Z-dag.';

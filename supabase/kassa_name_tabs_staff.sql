-- Medewerker die op rekening zette → kassa_staff_id op betaal-order (dagoverzicht / Z).
-- Alle tenants; kolom optioneel tot migratie gedraaid (code fallback zonder kolom).

ALTER TABLE kassa_name_tabs
  ADD COLUMN IF NOT EXISTS kassa_staff_id TEXT;

COMMENT ON COLUMN kassa_name_tabs.kassa_staff_id IS
  'Ingeklokte medewerker bij laatste «op rekening»-mand op tab; gebruikt bij betaling voor orders.kassa_staff_id.';

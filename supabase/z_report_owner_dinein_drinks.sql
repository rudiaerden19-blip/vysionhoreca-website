-- Avondtelling: ter plaatse eten 12% + ter plaatse drank 21% (alleen zaak met module aan).
ALTER TABLE z_reports
  ADD COLUMN IF NOT EXISTS owner_dinein_drinks_incl NUMERIC(12, 2);

COMMENT ON COLUMN z_reports.owner_dinein_drinks_incl IS
  'Avondtelling ter plaatse drank incl. 21%. owner_dinein_incl = ter plaatse eten 12%.';

-- Avondtelling: eigenaar vult cash / Bancontact / meenemen 6% / daar eten 21%.
-- Standaard UIT. Alleen aanzetten voor de zaak die het vraagt.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS z_report_owner_evening_close BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenant_settings.z_report_owner_evening_close IS
  'true = zaak vult Z zelf (cash, Bancontact, meenemen 6%, daar eten 21%). Default false.';

ALTER TABLE z_reports
  ADD COLUMN IF NOT EXISTS owner_cash NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS owner_card NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS owner_takeaway_incl NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS owner_dinein_incl NUMERIC(12, 2);

UPDATE tenant_settings
SET z_report_owner_evening_close = true
WHERE tenant_slug = 'tontbijthuisje';

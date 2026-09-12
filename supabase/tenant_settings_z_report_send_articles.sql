-- Z-rapport: artikelen (10 cola, …) meesturen naar de boekhouder in mail / print / PDF.
-- Standaard aan. Z-scherm van de zaak toont artikelen altijd.
-- Per zaak uitzetten via Superadmin → Modules of Z-rapport.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS z_report_send_articles_to_accountant BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN tenant_settings.z_report_send_articles_to_accountant IS
  'true = artikelregels in Z-mail/print/PDF; false = alleen omzet en BTW. Scherm blijft artikelen tonen.';

UPDATE tenant_settings
SET z_report_send_articles_to_accountant = false
WHERE tenant_slug = 'tontbijthuisje';

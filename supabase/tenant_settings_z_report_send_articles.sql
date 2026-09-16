-- Z-rapport: artikelen (10 cola, …) op scherm + mail / print / PDF.
-- Standaard aan. Per zaak uitzetten via Superadmin → Modules of Z-rapport.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS z_report_send_articles_to_accountant BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN tenant_settings.z_report_send_articles_to_accountant IS
  'true = artikelregels overal in Z; false = alleen omzet en BTW (geen cola/koffie-lijst).';

UPDATE tenant_settings
SET z_report_send_articles_to_accountant = false
WHERE tenant_slug = 'tontbijthuisje';

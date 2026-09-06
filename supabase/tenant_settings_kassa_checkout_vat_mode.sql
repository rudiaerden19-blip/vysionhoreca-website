-- BTW ter plaatse / meenemen bij kassa-afrekenen (Admin › Profiel).
-- Standaard uit. Alleen aanzetten voor zaken die 12%/6% moeten kiezen.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_checkout_vat_mode TEXT NOT NULL DEFAULT 'off';

COMMENT ON COLUMN tenant_settings.kassa_checkout_vat_mode IS
  'off | choose | dine_in | takeaway — kassa toont bij afrekenen Ter plaatse (12%) / Meenemen (6%) alleen bij choose.';

UPDATE tenant_settings
SET kassa_checkout_vat_mode = 'choose'
WHERE tenant_slug = 'tontbijthuisje';

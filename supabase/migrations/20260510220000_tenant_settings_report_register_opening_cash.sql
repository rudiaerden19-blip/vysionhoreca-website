-- Rapportages: begin kas (X-rapport) gedeeld per tenant — niet browser-localStorage.
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS report_register_opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.tenant_settings.report_register_opening_cash IS
  'Begin kas voor rapportage-X na laatste Z; één waarde per tenant voor alle admin-apparaten.';

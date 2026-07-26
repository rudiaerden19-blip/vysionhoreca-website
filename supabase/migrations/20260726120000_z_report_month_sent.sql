-- Log wanneer een tenant de Z-rapport-maandmail naar de boekhouder stuurde (per YYYY-MM).
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS z_report_month_sent JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tenant_settings.z_report_month_sent IS
  'Per maand (YYYY-MM): { sentAt: ISO, to: e-mail } — voor herinnering «nog niet gestuurd».';

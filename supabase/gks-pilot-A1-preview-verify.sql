-- Track A — preview-only: controleer GKS-pilot (bv. gkstest). Geen wijziging aan productie orders.
-- Uitvoeren in Supabase SQL Editor (zelfde project als Vercel preview).

-- 1) Zaak bestaat
SELECT tenant_slug, business_name, plan, subscription_status
FROM tenant_settings
WHERE tenant_slug = 'gkstest';

-- 2) Tabellen aanwezig (lege result = OK als geen error)
SELECT COUNT(*) AS gks_orders_rows FROM gks_commercial_orders WHERE tenant_slug = 'gkstest';
SELECT COUNT(*) AS fiscal_journal_rows FROM fiscal_journal WHERE tenant_slug = 'gkstest';

-- 3) Medewerkers met INSZ (fiscale verkoop)
SELECT id, name, insz, is_active
FROM staff
WHERE tenant_slug = 'gkstest' AND is_active = true;

-- 4) Migraties in repo (handmatig vergelijken met Supabase migration history):
--    20260606120000_gks_commercial_orders_isolated.sql
--    20260607100000_staff_insz_gks.sql
--    20260608120000_fiscal_journal.sql
--    20260608130000_fiscal_journal_commercial_order_id.sql

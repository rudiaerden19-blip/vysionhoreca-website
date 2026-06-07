-- Track A — preview-only: controleer GKS-pilot (bv. gkstest). Geen wijziging aan productie orders.
-- Uitvoeren in Supabase SQL Editor (zelfde project als Vercel preview).
--
-- Tijd: kolommen zijn timestamptz (UTC in de editor). Gebruik altijd Europe/Brussels om te lezen:
--   created_at AT TIME ZONE 'Europe/Brussels' AS tijd_belgie

-- 1a) Zaak-instellingen (tenant_settings)
SELECT tenant_slug, business_name
FROM tenant_settings
WHERE tenant_slug = 'gkstest';

-- 1b) Abonnement (plan staat op tenants, niet op tenant_settings)
SELECT slug, name, plan, subscription_status, trial_ends_at
FROM tenants
WHERE slug = 'gkstest';

-- 2) Tabellen aanwezig (lege result = OK als geen error)
SELECT COUNT(*) AS gks_orders_rows FROM gks_commercial_orders WHERE tenant_slug = 'gkstest';
SELECT COUNT(*) AS fiscal_journal_rows FROM fiscal_journal WHERE tenant_slug = 'gkstest';

-- 3) Medewerkers met INSZ (fiscale verkoop)
SELECT id, name, insz, is_active
FROM staff
WHERE tenant_slug = 'gkstest' AND is_active = true;

-- 4) Laatste fiscale verkopen (N) — tijd in België + koppeling commercial
SELECT
  fj.pos_fiscal_ticket_no,
  fj.status,
  fj.commercial_order_id,
  g.order_number,
  g.total,
  fj.created_at AT TIME ZONE 'Europe/Brussels' AS tijd_belgie
FROM fiscal_journal fj
LEFT JOIN gks_commercial_orders g
  ON g.tenant_slug = fj.tenant_slug AND g.id = fj.commercial_order_id
WHERE fj.tenant_slug = 'gkstest'
  AND fj.event_label = 'N'
ORDER BY fj.created_at DESC
LIMIT 5;

-- 4b) Open tafelmanden (commercial mirror)
SELECT
  table_number,
  floor_plan_zone,
  status,
  payment_status,
  jsonb_array_length(items) AS regels,
  updated_at AT TIME ZONE 'Europe/Brussels' AS tijd_belgie
FROM gks_commercial_orders
WHERE tenant_slug = 'gkstest'
  AND order_type = 'DINE_IN'
  AND status IN ('open', 'preparing')
ORDER BY updated_at DESC
LIMIT 10;

-- 5) Migraties in repo (handmatig vergelijken met Supabase migration history):
--    20260606120000_gks_commercial_orders_isolated.sql
--    20260607100000_staff_insz_gks.sql
--    20260608120000_fiscal_journal.sql
--    20260608130000_fiscal_journal_commercial_order_id.sql

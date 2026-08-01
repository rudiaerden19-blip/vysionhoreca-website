-- =============================================================================
-- Blonkys Restaurant — bonnen verwijderen na 23:01 (Brussels)
-- Tenant: blonkys-restaurant (NIET blonkys-snackbar)
--
-- Gebruik: bonnen die per ongeluk na sluiting (23:01) zijn afgerekend/testbonnen.
-- Pas @target_calendar_date aan (kalenderdag in Europe/Brussels).
--
-- Let op: verwijderde bonnen zijn weg uit admin + Z-rapport; maak daarna Z-rapport
-- opnieuw op voor getroffen fiscale dagen indien nodig.
-- =============================================================================

-- 0) Tenant controleren
SELECT tenant_slug, business_name, btw_number
FROM tenant_settings
WHERE tenant_slug = 'blonkys-restaurant'
   OR business_name ILIKE '%blonkys%restaurant%';

-- =============================================================================
-- PARAMETERS — pas alleen deze regel aan
-- =============================================================================
-- Kalenderdag waarop je alles vanaf 23:01:00 Brussels wilt wissen:
\set target_calendar_date '2026-08-01'

-- psql \set werkt niet in Supabase SQL Editor → vervang hieronder overal
--   DATE '2026-08-01'
-- door jouw datum.

-- =============================================================================
-- PREVIEW (draai eerst apart, zonder DELETE)
-- =============================================================================
SELECT
  o.id,
  o.order_number,
  o.order_type,
  o.payment_method,
  o.payment_status,
  o.status,
  o.total,
  o.created_at AT TIME ZONE 'Europe/Brussels' AS created_brussels,
  CASE
    WHEN EXTRACT(HOUR FROM (o.created_at AT TIME ZONE 'Europe/Brussels')) < 12
    THEN ((o.created_at AT TIME ZONE 'Europe/Brussels')::date - 1)
    ELSE (o.created_at AT TIME ZONE 'Europe/Brussels')::date
  END AS fiscal_report_date
FROM orders o
WHERE o.tenant_slug = 'blonkys-restaurant'
  AND (o.created_at AT TIME ZONE 'Europe/Brussels')::date = DATE '2026-08-01'
  AND (o.created_at AT TIME ZONE 'Europe/Brussels')::time >= TIME '23:01:00'
ORDER BY o.created_at;

-- =============================================================================
-- UITVOEREN (hele blok in één keer; pas datum indien nodig)
-- =============================================================================

BEGIN;

CREATE TEMP TABLE IF NOT EXISTS blonkys_bonnen_na_2301 ON COMMIT DROP AS
SELECT o.id
FROM orders o
WHERE o.tenant_slug = 'blonkys-restaurant'
  AND (o.created_at AT TIME ZONE 'Europe/Brussels')::date = DATE '2026-08-01'
  AND (o.created_at AT TIME ZONE 'Europe/Brussels')::time >= TIME '23:01:00';

CREATE TEMP TABLE IF NOT EXISTS blonkys_fiscale_dagen ON COMMIT DROP AS
SELECT DISTINCT
  CASE
    WHEN EXTRACT(HOUR FROM (o.created_at AT TIME ZONE 'Europe/Brussels')) < 12
    THEN ((o.created_at AT TIME ZONE 'Europe/Brussels')::date - 1)
    ELSE (o.created_at AT TIME ZONE 'Europe/Brussels')::date
  END AS report_date
FROM orders o
INNER JOIN blonkys_bonnen_na_2301 b ON b.id = o.id;

-- order_items + kasboek-koppelingen vallen mee via ON DELETE CASCADE op orders
DELETE FROM orders o
USING blonkys_bonnen_na_2301 b
WHERE o.id = b.id;

-- z_reports.order_ids opschonen (IDs die net verwijderd zijn)
UPDATE z_reports z
SET
  order_ids = COALESCE(
    (
      SELECT array_agg(x)
      FROM unnest(COALESCE(z.order_ids, '{}'::uuid[])) AS x
      WHERE NOT EXISTS (SELECT 1 FROM blonkys_bonnen_na_2301 b WHERE b.id = x)
    ),
    '{}'::uuid[]
  ),
  order_count = GREATEST(
    0,
    COALESCE(z.order_count, 0) - (SELECT count(*)::int FROM blonkys_bonnen_na_2301)
  ),
  generated_at = now()
WHERE z.tenant_slug = 'blonkys-restaurant'
  AND z.report_date IN (SELECT report_date FROM blonkys_fiscale_dagen);

-- Controle (temp-tabel blijft IDs van verwijderde bonnen bevatten)
SELECT count(*) AS verwijderd FROM blonkys_bonnen_na_2301;

SELECT report_date, order_count, total, cardinality(order_ids) AS ids_in_archief
FROM z_reports
WHERE tenant_slug = 'blonkys-restaurant'
  AND report_date IN (SELECT report_date FROM blonkys_fiscale_dagen)
ORDER BY report_date;

COMMIT;

-- Daarna in admin (aanbevolen): Z-rapport → getroffen fiscale dag → Opslaan
-- (BTW-detail + hash opnieuw), zelfde als bij andere Blonkys-handfixes.
-- https://blonkys-restaurant.ordervysion.com/shop/blonkys-restaurant/admin/z-rapport

-- =============================================================================
-- Optioneel: elke nacht om 23:02 Brussels automatisch (pg_cron, alleen service role)
-- Uncomment alleen als Supabase pg_cron aan staat en je dit echt dagelijks wilt.
-- =============================================================================
-- SELECT cron.schedule(
--   'blonkys-delete-bonnen-after-2301',
--   '2 21 * * *',  -- ~23:02 CEST (pas in winter naar '2 22 * * *' CET)
--   $$
--   DELETE FROM orders o
--   WHERE o.tenant_slug = 'blonkys-restaurant'
--     AND (o.created_at AT TIME ZONE 'Europe/Brussels')::date
--         = (now() AT TIME ZONE 'Europe/Brussels')::date
--     AND (o.created_at AT TIME ZONE 'Europe/Brussels')::time >= TIME '23:01:00';
--   $$
-- );

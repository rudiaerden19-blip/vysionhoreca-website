-- Eénmalig: verkoopbonnen fiscale dag 22/07/2026 → 10/07/2026
-- Tenant: Blonkys Restaurant (slug: blonkys-restaurant)
-- NIET Blonkys Snackbar — alleen deze tenant.
--
-- Z-rapport en kassa gebruiken orders.created_at (fiscale dag België: 00:00 t/m 12:00 volgende dag).
-- Dit script verschuift alle relevante orders 12 dagen terug zodat ze op 10 juli tellen.
--
-- Uitvoeren in Supabase SQL Editor (productie). Eerst alleen de SELECT-stappen draaien en controleren.
-- Daarna BEGIN … COMMIT of stap voor stap.

-- ---------------------------------------------------------------------------
-- 1. Controle: juiste tenant (moet Blonkys Restaurant zijn)
-- ---------------------------------------------------------------------------
SELECT tenant_slug, business_name, btw_number
FROM tenant_settings
WHERE tenant_slug = 'blonkys-restaurant';

-- ---------------------------------------------------------------------------
-- 2. Preview: bonnen op fiscale dag 22/07/2026 (CEST)
--    Grenzen = zelfde logica als getZRapportDateBounds('2026-07-22')
-- ---------------------------------------------------------------------------
SELECT
  id,
  order_number,
  order_type,
  status,
  payment_status,
  total,
  created_at AT TIME ZONE 'Europe/Brussels' AS created_brussels,
  completed_at AT TIME ZONE 'Europe/Brussels' AS completed_brussels
FROM orders
WHERE tenant_slug = 'blonkys-restaurant'
  AND created_at >= timestamptz '2026-07-21 22:00:00+00'  -- 22/07 00:00 CEST
  AND created_at <  timestamptz '2026-07-23 10:00:00+00'  -- 23/07 12:00 CEST
  AND lower(coalesce(status, '')) NOT IN ('cancelled', 'rejected')
ORDER BY created_at;

-- ---------------------------------------------------------------------------
-- 3. Verplaats bonnen: 22 juli → 10 juli (−12 dagen, tijdstip behouden)
-- ---------------------------------------------------------------------------
-- BEGIN;

UPDATE orders
SET
  created_at = created_at - INTERVAL '12 days',
  completed_at = CASE
    WHEN completed_at IS NOT NULL
     AND completed_at >= timestamptz '2026-07-21 22:00:00+00'
     AND completed_at <  timestamptz '2026-07-23 10:00:00+00'
    THEN completed_at - INTERVAL '12 days'
    ELSE completed_at
  END,
  updated_at = now()
WHERE tenant_slug = 'blonkys-restaurant'
  AND created_at >= timestamptz '2026-07-21 22:00:00+00'
  AND created_at <  timestamptz '2026-07-23 10:00:00+00'
  AND lower(coalesce(status, '')) NOT IN ('cancelled', 'rejected');

-- Kasboek-regels (tenant_kasboek_manual_lines) worden via trigger bijgewerkt op created_at UPDATE.

-- ---------------------------------------------------------------------------
-- 4. Oude Z-rapportdag 22/07 leegmaken (anders blijft oude omzet in archief staan)
-- ---------------------------------------------------------------------------
UPDATE z_reports
SET
  order_count = 0,
  subtotal = 0,
  tax_low = 0,
  tax_mid = 0,
  tax_high = 0,
  total = 0,
  cash_payments = 0,
  card_payments = 0,
  online_payments = 0,
  order_ids = '{}',
  generated_at = now()
WHERE tenant_slug = 'blonkys-restaurant'
  AND report_date = '2026-07-22'
  AND coalesce(is_closed, false) = false;

-- Als 22/07 al afgesloten was: NIET overschrijven — eerst met zaak overleggen (GKS).

-- ---------------------------------------------------------------------------
-- 5. Z-rapport 10/07 herberekenen
-- ---------------------------------------------------------------------------
-- Admin: https://blonkys-restaurant.ordervysion.com/shop/blonkys-restaurant/admin/z-rapport
-- → datum 10/07/2026 → Opslaan (of Vernieuwen).
-- Of API (ingelogd als tenant):
--   POST /api/kassa/sync-z-report
--   Body: { "tenantSlug": "blonkys-restaurant", "date": "2026-07-10" }
-- Herhaal eventueel voor 2026-07-22 na controle.

-- COMMIT;

-- ---------------------------------------------------------------------------
-- 6. Controle na uitvoering
-- ---------------------------------------------------------------------------
SELECT
  (timezone('Europe/Brussels', created_at))::date AS verkoopdag,
  count(*) AS aantal,
  round(sum(total)::numeric, 2) AS omzet
FROM orders
WHERE tenant_slug = 'blonkys-restaurant'
  AND (timezone('Europe/Brussels', created_at))::date IN ('2026-07-10', '2026-07-22')
  AND lower(coalesce(status, '')) NOT IN ('cancelled', 'rejected')
GROUP BY 1
ORDER BY 1;

-- =============================================================================
-- Blonkys Restaurant — bonnen fiscale dag 22/07/2026 → 10/07/2026
-- Tenant: blonkys-restaurant (NIET snackbar)
--
-- Probleem: alleen orders verplaatsen is niet genoeg — de archieflijst leest
-- z_reports. Daarom: orders verplaatsen + z_reports voor 10/07 en 22/07 herbouwen.
--
-- Fiscale dag (CEST): 00:00 t/m 12:00 volgende dag
--   22/07/2026 → 2026-07-21 22:00 UTC t/m 2026-07-23 10:00 UTC
--   10/07/2026 → 2026-07-09 22:00 UTC t/m 2026-07-11 10:00 UTC
-- =============================================================================

-- 0) Welke Blonk-tenant is dit?
SELECT tenant_slug, business_name, btw_number
FROM tenant_settings
WHERE tenant_slug ILIKE '%blonk%'
   OR business_name ILIKE '%blonk%';

-- =============================================================================
-- UITVOEREN (hele blok hieronder in één keer)
-- =============================================================================

BEGIN;

-- A) Preview: bonnen die van 22/07 naar 10/07 gaan
SELECT
  id,
  order_number,
  order_type,
  status,
  payment_status,
  total,
  created_at AT TIME ZONE 'Europe/Brussels' AS created_brussels
FROM orders
WHERE tenant_slug = 'blonkys-restaurant'
  AND created_at >= timestamptz '2026-07-21 22:00:00+00'
  AND created_at <  timestamptz '2026-07-23 10:00:00+00'
  AND lower(coalesce(status, '')) NOT IN ('cancelled', 'rejected')
ORDER BY created_at;

-- B) Verplaats bonnen (−12 dagen)
WITH to_move AS (
  SELECT id
  FROM orders
  WHERE tenant_slug = 'blonkys-restaurant'
    AND created_at >= timestamptz '2026-07-21 22:00:00+00'
    AND created_at <  timestamptz '2026-07-23 10:00:00+00'
    AND lower(coalesce(status, '')) NOT IN ('cancelled', 'rejected')
)
UPDATE orders o
SET
  created_at = o.created_at - INTERVAL '12 days',
  completed_at = CASE
    WHEN o.completed_at IS NOT NULL
     AND o.completed_at >= timestamptz '2026-07-21 22:00:00+00'
     AND o.completed_at <  timestamptz '2026-07-23 10:00:00+00'
    THEN o.completed_at - INTERVAL '12 days'
    ELSE o.completed_at
  END,
  updated_at = now()
FROM to_move m
WHERE o.id = m.id;

-- C) 22/07 in archief leegmaken (oude €887,70 weg)
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
  AND report_date = '2026-07-22';

-- D) z_reports 10/07/2026 aanmaken/bijwerken (verschijnt in archieflijst)
INSERT INTO z_reports (
  tenant_slug,
  report_date,
  order_count,
  subtotal,
  tax_low,
  tax_mid,
  tax_high,
  total,
  cash_payments,
  card_payments,
  online_payments,
  order_ids,
  generated_at,
  btw_percentage,
  business_name,
  business_address,
  btw_number
)
SELECT
  'blonkys-restaurant',
  DATE '2026-07-10',
  count(*)::int,
  coalesce(round(sum(o.total)::numeric, 2), 0),
  0,
  0,
  0,
  coalesce(round(sum(o.total)::numeric, 2), 0),
  coalesce(round(sum(CASE WHEN lower(coalesce(o.payment_method, '')) IN ('cash', 'contant') THEN o.total ELSE 0 END)::numeric, 2), 0),
  coalesce(round(sum(CASE WHEN lower(coalesce(o.payment_method, '')) IN ('card', 'pin', 'kaart') THEN o.total ELSE 0 END)::numeric, 2), 0),
  coalesce(round(sum(CASE WHEN lower(coalesce(o.payment_method, '')) NOT IN ('cash', 'contant', 'card', 'pin', 'kaart', 'split') THEN o.total ELSE 0 END)::numeric, 2), 0),
  coalesce(array_agg(o.id), '{}'),
  now(),
  coalesce(ts.btw_percentage, 6),
  ts.business_name,
  ts.address,
  ts.btw_number
FROM orders o
LEFT JOIN tenant_settings ts ON ts.tenant_slug = 'blonkys-restaurant'
WHERE o.tenant_slug = 'blonkys-restaurant'
  AND o.created_at >= timestamptz '2026-07-09 22:00:00+00'
  AND o.created_at <  timestamptz '2026-07-11 10:00:00+00'
  AND lower(coalesce(o.status, '')) NOT IN ('cancelled', 'rejected')
  AND (
    (
      lower(coalesce(o.order_type, '')) IN ('dine_in', 'takeaway', 'delivery')
      AND lower(coalesce(o.payment_status, '')) = 'paid'
    )
    OR (
      lower(coalesce(o.order_type, '')) NOT IN ('dine_in', 'takeaway', 'delivery')
      AND (
        lower(coalesce(o.status, '')) IN ('confirmed', 'preparing', 'ready', 'completed', 'delivered')
        OR lower(coalesce(o.payment_status, '')) = 'paid'
      )
    )
  )
GROUP BY ts.btw_percentage, ts.business_name, ts.address, ts.btw_number
ON CONFLICT (tenant_slug, report_date) DO UPDATE SET
  order_count = EXCLUDED.order_count,
  subtotal = EXCLUDED.subtotal,
  total = EXCLUDED.total,
  cash_payments = EXCLUDED.cash_payments,
  card_payments = EXCLUDED.card_payments,
  online_payments = EXCLUDED.online_payments,
  order_ids = EXCLUDED.order_ids,
  generated_at = now();

-- E) 22/07 opnieuw opbouwen uit resterende orders (meestal 0 na verplaatsing)
INSERT INTO z_reports (
  tenant_slug,
  report_date,
  order_count,
  subtotal,
  tax_low,
  tax_mid,
  tax_high,
  total,
  cash_payments,
  card_payments,
  online_payments,
  order_ids,
  generated_at,
  btw_percentage,
  business_name,
  business_address,
  btw_number
)
SELECT
  'blonkys-restaurant',
  DATE '2026-07-22',
  count(*)::int,
  coalesce(round(sum(o.total)::numeric, 2), 0),
  0,
  0,
  0,
  coalesce(round(sum(o.total)::numeric, 2), 0),
  coalesce(round(sum(CASE WHEN lower(coalesce(o.payment_method, '')) IN ('cash', 'contant') THEN o.total ELSE 0 END)::numeric, 2), 0),
  coalesce(round(sum(CASE WHEN lower(coalesce(o.payment_method, '')) IN ('card', 'pin', 'kaart') THEN o.total ELSE 0 END)::numeric, 2), 0),
  coalesce(round(sum(CASE WHEN lower(coalesce(o.payment_method, '')) NOT IN ('cash', 'contant', 'card', 'pin', 'kaart', 'split') THEN o.total ELSE 0 END)::numeric, 2), 0),
  coalesce(array_agg(o.id), '{}'),
  now(),
  coalesce(ts.btw_percentage, 6),
  ts.business_name,
  ts.address,
  ts.btw_number
FROM orders o
LEFT JOIN tenant_settings ts ON ts.tenant_slug = 'blonkys-restaurant'
WHERE o.tenant_slug = 'blonkys-restaurant'
  AND o.created_at >= timestamptz '2026-07-21 22:00:00+00'
  AND o.created_at <  timestamptz '2026-07-23 10:00:00+00'
  AND lower(coalesce(o.status, '')) NOT IN ('cancelled', 'rejected')
  AND (
    (
      lower(coalesce(o.order_type, '')) IN ('dine_in', 'takeaway', 'delivery')
      AND lower(coalesce(o.payment_status, '')) = 'paid'
    )
    OR (
      lower(coalesce(o.order_type, '')) NOT IN ('dine_in', 'takeaway', 'delivery')
      AND (
        lower(coalesce(o.status, '')) IN ('confirmed', 'preparing', 'ready', 'completed', 'delivered')
        OR lower(coalesce(o.payment_status, '')) = 'paid'
      )
    )
  )
GROUP BY ts.btw_percentage, ts.business_name, ts.address, ts.btw_number
ON CONFLICT (tenant_slug, report_date) DO UPDATE SET
  order_count = EXCLUDED.order_count,
  subtotal = EXCLUDED.subtotal,
  total = EXCLUDED.total,
  cash_payments = EXCLUDED.cash_payments,
  card_payments = EXCLUDED.card_payments,
  online_payments = EXCLUDED.online_payments,
  order_ids = EXCLUDED.order_ids,
  generated_at = now();

-- F) Controle
SELECT report_date, order_count, total
FROM z_reports
WHERE tenant_slug = 'blonkys-restaurant'
  AND report_date IN ('2026-07-10', '2026-07-22')
ORDER BY report_date;

COMMIT;

-- G) Daarna in admin: Z-rapport → 10/07 en 22/07 → Opslaan (BTW-detail + hash)
-- https://blonkys-restaurant.ordervysion.com/shop/blonkys-restaurant/admin/z-rapport

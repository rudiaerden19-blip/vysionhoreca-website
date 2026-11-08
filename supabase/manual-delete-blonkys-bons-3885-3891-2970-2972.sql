-- =============================================================================
-- Blonkys — specifieke kassabonnen verwijderen (ALLEEN deze tenants + nummers)
--
-- Snackbar/eethuis: bon 3885, 3891  → tenant slug: blonkyseethuis (standaard)
-- Restaurant:      bon 2970, 2972  → tenant slug: blonkys-restaurant
--
-- Draai in Supabase SQL Editor (service role). STAP 0 eerst — controleer slugs.
-- Na COMMIT: per tenant in admin → Rapporten / Z-rapport → fiscale dag(en)
-- uit STAP 1b openen en «Vernieuwen» (of sync) zodat archief geen oude totalen meer toont.
-- =============================================================================

-- ── STAP 0: welke Blonk-tenant is welke slug? ──
SELECT tenant_slug, business_name
FROM tenant_settings
WHERE tenant_slug IN ('blonkyseethuis', 'blonkys-restaurant')
   OR tenant_slug ILIKE '%blonk%'
ORDER BY tenant_slug;

-- ── STAP 1a: PREVIEW — exact deze bonnen ──
SELECT tenant_slug, id, order_number, status, payment_status, total,
       created_at AT TIME ZONE 'Europe/Brussels' AS created_brussels
FROM orders
WHERE (tenant_slug = 'blonkyseethuis' AND order_number IN (3885, 3891))
   OR (tenant_slug = 'blonkys-restaurant' AND order_number IN (2970, 2972))
ORDER BY tenant_slug, order_number;

-- ── STAP 1b: fiscale dagen (Europe/Brussels kalenderdag; Z-rapport daarna vernieuwen) ──
SELECT DISTINCT
  tenant_slug,
  (created_at AT TIME ZONE 'Europe/Brussels')::date AS report_day_approx
FROM orders
WHERE (tenant_slug = 'blonkyseethuis' AND order_number IN (3885, 3891))
   OR (tenant_slug = 'blonkys-restaurant' AND order_number IN (2970, 2972));

-- =============================================================================
-- UITVOEREN (alleen als PREVIEW klopt — anders ROLLBACK)
-- =============================================================================

BEGIN;

-- Snackbar/eethuis
DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM orders
  WHERE tenant_slug = 'blonkyseethuis'
    AND order_number IN (3885, 3891)
);

DELETE FROM orders
WHERE tenant_slug = 'blonkyseethuis'
  AND order_number IN (3885, 3891);

-- Restaurant (NIET snackbar)
DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM orders
  WHERE tenant_slug = 'blonkys-restaurant'
    AND order_number IN (2970, 2972)
);

DELETE FROM orders
WHERE tenant_slug = 'blonkys-restaurant'
  AND order_number IN (2970, 2972);

-- ── STAP 3: controle (moet 0 rijen zijn voor deze nummers) ──
SELECT tenant_slug, order_number, COUNT(*) AS n
FROM orders
WHERE (tenant_slug = 'blonkyseethuis' AND order_number IN (3885, 3891))
   OR (tenant_slug = 'blonkys-restaurant' AND order_number IN (2970, 2972))
GROUP BY tenant_slug, order_number;

COMMIT;

-- Geen andere tenants, geen andere bonnummers.

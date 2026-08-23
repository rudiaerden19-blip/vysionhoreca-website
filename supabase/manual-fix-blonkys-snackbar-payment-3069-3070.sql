-- =============================================================================
-- Snackbar Blonkys — bon 3069 en 3070: betaling CARD → CASH (contant)
--
-- NIET uitvoeren op blonkys-restaurant (dat is het restaurant).
-- Stap 0: zoek de juiste tenant_slug voor de snackbar en zet die in cfg hieronder.
-- =============================================================================

-- 0) Welke Blonk-tenant is de snackbar?
SELECT tenant_slug, business_name, btw_number
FROM tenant_settings
WHERE tenant_slug ILIKE '%blonk%'
   OR business_name ILIKE '%blonk%'
ORDER BY tenant_slug;

-- =============================================================================
-- 1) PREVIEW (draai los, vóór UPDATE)
-- =============================================================================
WITH cfg AS (
  SELECT
    -- << PAS AAN na stap 0 (snackbar, niet restaurant):
    'VERVANG-MET-SNACKBAR-TENANT-SLUG'::text AS tenant_slug
)
SELECT
  o.id,
  o.order_number,
  o.tenant_slug,
  o.payment_method,
  o.payment_split_cash,
  o.payment_split_card,
  o.total,
  o.order_type,
  o.status,
  o.payment_status,
  o.created_at AT TIME ZONE 'Europe/Brussels' AS created_brussels
FROM orders o
CROSS JOIN cfg c
WHERE o.tenant_slug = c.tenant_slug
  AND o.order_number IN (3069, 3070)
ORDER BY o.order_number;

-- =============================================================================
-- 2) UPDATE (BEGIN … COMMIT — alleen na goede preview)
-- =============================================================================
BEGIN;

WITH cfg AS (
  SELECT 'VERVANG-MET-SNACKBAR-TENANT-SLUG'::text AS tenant_slug
),
targets AS (
  SELECT o.id
  FROM orders o
  CROSS JOIN cfg c
  WHERE o.tenant_slug = c.tenant_slug
    AND o.order_number IN (3069, 3070)
    AND lower(coalesce(o.status, '')) NOT IN ('cancelled', 'rejected')
)
UPDATE orders o
SET
  payment_method = 'CASH',
  payment_split_cash = NULL,
  payment_split_card = NULL,
  updated_at = now()
FROM targets t
WHERE o.id = t.id;

-- Controle na update
WITH cfg AS (
  SELECT 'VERVANG-MET-SNACKBAR-TENANT-SLUG'::text AS tenant_slug
)
SELECT
  o.order_number,
  o.payment_method,
  o.total,
  o.created_at AT TIME ZONE 'Europe/Brussels' AS created_brussels
FROM orders o
CROSS JOIN cfg c
WHERE o.tenant_slug = c.tenant_slug
  AND o.order_number IN (3069, 3070)
ORDER BY o.order_number;

COMMIT;

-- =============================================================================
-- 3) Z-rapport (belangrijk)
-- =============================================================================
-- cash_payments / card_payments op z_reports komen uit payment_method per bon.
-- Na deze fix: in admin → Z-rapport → open de fiscale dag(en) van 3069/3070
-- → Opslaan (BTW-detail + hash), of herbouw die dag(en) zoals in
-- manual-fix-blonkys-sales-2026-07-22-to-07-10.sql (sectie D/E).
--
-- Welke Z-dagen raken deze bonnen? (order_ids bevat UUID)
WITH cfg AS (
  SELECT 'VERVANG-MET-SNACKBAR-TENANT-SLUG'::text AS tenant_slug
),
bon AS (
  SELECT o.id
  FROM orders o
  CROSS JOIN cfg c
  WHERE o.tenant_slug = c.tenant_slug
    AND o.order_number IN (3069, 3070)
)
SELECT z.report_date, z.cash_payments, z.card_payments, z.total, z.order_count
FROM z_reports z
CROSS JOIN cfg c
WHERE z.tenant_slug = c.tenant_slug
  AND EXISTS (
    SELECT 1 FROM bon b WHERE b.id = ANY (z.order_ids)
  )
ORDER BY z.report_date;

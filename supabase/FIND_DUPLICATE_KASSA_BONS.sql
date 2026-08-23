-- Dubbele kassa-bonnen opsporen (Supabase → SQL Editor → Run)
-- Vervang :tenant_slug of zet AND o.tenant_slug = 'jouw-slug' waar nodig.
-- Kassa-POS = order_type DINE_IN | TAKEAWAY | DELIVERY (hoofdletters), betaald.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Zelfde bonnummer twee keer (zelfde tenant) — zou normaal niet mogen
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  tenant_slug,
  order_number,
  COUNT(*) AS aantal,
  ARRAY_AGG(id ORDER BY created_at) AS order_ids,
  ARRAY_AGG(total ORDER BY created_at) AS totalen,
  ARRAY_AGG(status ORDER BY created_at) AS statussen,
  ARRAY_AGG(created_at ORDER BY created_at) AS aangemaakt
FROM public.orders
WHERE payment_status = 'paid'
  AND order_type IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY')
  AND COALESCE(status, '') NOT IN ('open', 'cancelled', 'rejected')
  -- AND tenant_slug = 'jouw-slug'
GROUP BY tenant_slug, order_number
HAVING COUNT(*) > 1
ORDER BY tenant_slug, order_number;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Dubbele kassa_client_uuid (offline retry) — unieke index zou 0 rijen geven
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  tenant_slug,
  kassa_client_uuid,
  COUNT(*) AS aantal,
  ARRAY_AGG(id ORDER BY created_at) AS order_ids,
  ARRAY_AGG(order_number ORDER BY created_at) AS bon_nummers,
  ARRAY_AGG(created_at ORDER BY created_at) AS aangemaakt
FROM public.orders
WHERE kassa_client_uuid IS NOT NULL
GROUP BY tenant_slug, kassa_client_uuid
HAVING COUNT(*) > 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Verdachte dubbele checkout (zelfde bedrag + betaalwijze binnen 2 minuten)
--    Vaak dubbele sync zonder kassa_client_uuid (oude app / dubbel tikken)
-- ─────────────────────────────────────────────────────────────────────────────
WITH paid_kassa AS (
  SELECT
    id,
    tenant_slug,
    order_number,
    total,
    payment_method,
    kassa_client_uuid,
    created_at
  FROM public.orders
  WHERE payment_status = 'paid'
    AND order_type IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY')
    AND COALESCE(status, '') NOT IN ('open', 'cancelled', 'rejected')
    -- AND tenant_slug = 'jouw-slug'
),
pairs AS (
  SELECT
    a.tenant_slug,
    a.id AS id_a,
    b.id AS id_b,
    a.order_number AS bon_a,
    b.order_number AS bon_b,
    a.total,
    a.payment_method,
    a.kassa_client_uuid AS uuid_a,
    b.kassa_client_uuid AS uuid_b,
    a.created_at AS tijd_a,
    b.created_at AS tijd_b,
    b.created_at - a.created_at AS verschil
  FROM paid_kassa a
  JOIN paid_kassa b
    ON b.tenant_slug = a.tenant_slug
   AND b.id > a.id
   AND b.total = a.total
   AND COALESCE(b.payment_method, '') = COALESCE(a.payment_method, '')
   AND b.created_at > a.created_at
   AND b.created_at - a.created_at < INTERVAL '2 minutes'
)
SELECT *
FROM pairs
ORDER BY tenant_slug, tijd_a DESC
LIMIT 200;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Zelfde order UUID in meerdere Z-rapporten (zelfde tenant, zelfde fiscale dag)
--    Vereist kolom z_reports.order_ids (uuid[])
-- ─────────────────────────────────────────────────────────────────────────────
WITH expanded AS (
  SELECT
    z.tenant_slug,
    z.report_date,
    z.id AS z_report_id,
    unnest(COALESCE(z.order_ids, ARRAY[]::uuid[])) AS order_id
  FROM public.z_reports z
  WHERE z.order_ids IS NOT NULL
    AND cardinality(z.order_ids) > 0
    -- AND z.tenant_slug = 'jouw-slug'
),
dup_in_archive AS (
  SELECT tenant_slug, order_id, COUNT(*) AS in_hoeveel_z_rapporten,
         ARRAY_AGG(DISTINCT report_date ORDER BY report_date) AS datums,
         ARRAY_AGG(z_report_id) AS z_report_ids
  FROM expanded
  GROUP BY tenant_slug, order_id
  HAVING COUNT(*) > 1
)
SELECT d.*, o.order_number, o.total, o.created_at
FROM dup_in_archive d
LEFT JOIN public.orders o ON o.id = d.order_id
ORDER BY d.tenant_slug, o.created_at DESC
LIMIT 200;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Betaalde kassa-bon telt niet mee in Z (status/filter) — geen dubbele bon,
--    wel “dubbele boekhouding” risico; zie ook /api/superadmin/audit-z-reports
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  o.tenant_slug,
  o.id,
  o.order_number,
  o.total,
  o.status,
  o.payment_status,
  o.order_type,
  o.created_at
FROM public.orders o
WHERE o.payment_status = 'paid'
  AND o.order_type IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY')
  AND COALESCE(o.status, '') NOT IN ('completed', 'cancelled', 'rejected', 'open')
ORDER BY o.created_at DESC
LIMIT 100;

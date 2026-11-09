-- =============================================================================
-- Döner kebab Laakdal — kassabonnen 1061 en 1062 verwijderen (ALLEEN deze bonnen)
--
-- Keuken / bestellijst / admin bestellingen = tabel `orders` → verdwijnt mee.
-- Z-rapport: na COMMIT → admin → Rapporten / Z-rapport → betreffende fiscale dag
--            openen en «Vernieuwen» (sync) zodat totalen/order_ids kloppen.
--
-- Draai in Supabase SQL Editor (service role).
-- STAP 0 + STAP 1 eerst; STAP 2 alleen als preview klopt.
-- =============================================================================

-- ── STAP 0: juiste tenant_slug (historisch soms met/zonder «o») ──
SELECT tenant_slug, business_name, email
FROM tenant_settings
WHERE tenant_slug IN ('donerkebablaakdal', 'dnerkebablaakdal')
   OR business_name ILIKE '%laakdal%'
ORDER BY tenant_slug;

-- ── STAP 1: PREVIEW — bonnen 1061 en 1062 ──
SELECT tenant_slug, id, order_number, status, payment_status, payment_method, total,
       created_at AT TIME ZONE 'Europe/Brussels' AS created_brussels
FROM orders
WHERE tenant_slug IN ('donerkebablaakdal', 'dnerkebablaakdal')
  AND order_number IN (1061, 1062)
ORDER BY order_number;

SELECT oi.order_id, o.order_number, oi.name, oi.quantity, oi.price
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.tenant_slug IN ('donerkebablaakdal', 'dnerkebablaakdal')
  AND o.order_number IN (1061, 1062)
ORDER BY o.order_number, oi.created_at;

SELECT DISTINCT
  tenant_slug,
  (created_at AT TIME ZONE 'Europe/Brussels')::date AS z_report_day_refresh
FROM orders
WHERE tenant_slug IN ('donerkebablaakdal', 'dnerkebablaakdal')
  AND order_number IN (1061, 1062);

-- =============================================================================
-- STAP 2: UITVOEREN (anders ROLLBACK)
-- =============================================================================

BEGIN;

DO $$
DECLARE
  target_slugs TEXT[] := ARRAY['donerkebablaakdal', 'dnerkebablaakdal'];
  target_nums INT[] := ARRAY[1061, 1062];
  cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM orders
  WHERE tenant_slug = ANY(target_slugs)
    AND order_number = ANY(target_nums);

  IF cnt = 0 THEN
    RAISE EXCEPTION 'Geen orders 1061/1062 voor Laakdal — STOP (controleer slug in STAP 0)';
  END IF;
  IF cnt > 2 THEN
    RAISE EXCEPTION 'Meer dan 2 orders gevonden (% ) — STOP en controleer STAP 1', cnt;
  END IF;
END $$;

-- Optioneel: reviews gekoppeld aan deze orders
DO $$
BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    DELETE FROM reviews
    WHERE order_id IN (
      SELECT id FROM orders
      WHERE tenant_slug IN ('donerkebablaakdal', 'dnerkebablaakdal')
        AND order_number IN (1061, 1062)
    );
  END IF;
END $$;

-- Label-queue / product_labels (indien migratie actief)
DO $$
BEGIN
  IF to_regclass('public.product_label_queue') IS NOT NULL THEN
    DELETE FROM product_label_queue
    WHERE order_id IN (
      SELECT id FROM orders
      WHERE tenant_slug IN ('donerkebablaakdal', 'dnerkebablaakdal')
        AND order_number IN (1061, 1062)
    );
  END IF;
END $$;

-- Z-rapport: verwijderde order-UUIDs uit order_ids vóór delete
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'z_reports' AND column_name = 'order_ids'
  ) THEN
    UPDATE z_reports z
    SET order_ids = COALESCE(
      (
        SELECT array_agg(u.uid)
        FROM unnest(z.order_ids) AS u(uid)
        WHERE u.uid NOT IN (
          SELECT o.id
          FROM orders o
          WHERE o.tenant_slug IN ('donerkebablaakdal', 'dnerkebablaakdal')
            AND o.order_number IN (1061, 1062)
        )
      ),
      '{}'::uuid[]
    )
    WHERE z.tenant_slug IN ('donerkebablaakdal', 'dnerkebablaakdal')
      AND EXISTS (
        SELECT 1
        FROM unnest(z.order_ids) AS u(uid)
        WHERE u.uid IN (
          SELECT o.id
          FROM orders o
          WHERE o.tenant_slug IN ('donerkebablaakdal', 'dnerkebablaakdal')
            AND o.order_number IN (1061, 1062)
        )
      );
  END IF;
END $$;

DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM orders
  WHERE tenant_slug IN ('donerkebablaakdal', 'dnerkebablaakdal')
    AND order_number IN (1061, 1062)
);

-- Kasboek-regels «order» vallen mee via ON DELETE CASCADE op order_id (indien aanwezig).
DELETE FROM orders
WHERE tenant_slug IN ('donerkebablaakdal', 'dnerkebablaakdal')
  AND order_number IN (1061, 1062);

-- ── controle (moet 0 rijen) ──
SELECT tenant_slug, order_number, COUNT(*) AS n
FROM orders
WHERE tenant_slug IN ('donerkebablaakdal', 'dnerkebablaakdal')
  AND order_number IN (1061, 1062)
GROUP BY tenant_slug, order_number;

COMMIT;

-- Geen andere bonnummers, geen andere tenants.

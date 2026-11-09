-- =============================================================================
-- Döner kebab Laakdal — bon 1061 en 1062 verwijderen
--
-- STAP A + B alleen lezen. STAP C apart plakken en Run (niet hele bestand tegelijk).
-- Na COMMIT: admin → Z-rapport → fiscale dag(en) uit STAP B → Vernieuwen.
--
-- Pas indien nodig: laatste regel slug (standaard dnerkebablaakdal uit tenant_settings).
-- =============================================================================

-- ── STAP A: tenant_slug controleren ──
SELECT tenant_slug, business_name
FROM tenant_settings
WHERE tenant_slug IN ('dnerkebablaakdal', 'donerkebablaakdal')
   OR business_name ILIKE '%laakdal%';

-- ── STAP B: PREVIEW ──
SELECT tenant_slug, id, order_number, status, payment_status, total,
       created_at AT TIME ZONE 'Europe/Brussels' AS created_brussels
FROM orders
WHERE tenant_slug = 'dnerkebablaakdal'
  AND order_number IN (1061, 1062)
ORDER BY order_number;

-- Werkt bovenstaand 0 rijen? Vervang in STAP C `dnerkebablaakdal` door slug uit STAP A.

SELECT oi.order_id, o.order_number, oi.product_name, oi.quantity, oi.total_price
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.tenant_slug = 'dnerkebablaakdal'
  AND o.order_number IN (1061, 1062)
ORDER BY o.order_number;

-- =============================================================================
-- STAP C — alleen dit blok uitvoeren na goede PREVIEW
-- =============================================================================

BEGIN;

DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM orders
  WHERE tenant_slug = 'dnerkebablaakdal'
    AND order_number IN (1061, 1062)
);

DELETE FROM orders
WHERE tenant_slug = 'dnerkebablaakdal'
  AND order_number IN (1061, 1062);

SELECT tenant_slug, order_number, COUNT(*) AS remaining
FROM orders
WHERE tenant_slug = 'dnerkebablaakdal'
  AND order_number IN (1061, 1062)
GROUP BY tenant_slug, order_number;

COMMIT;

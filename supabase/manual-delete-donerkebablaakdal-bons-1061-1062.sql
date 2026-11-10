-- =============================================================================
-- Döner kebab Laakdal — bon 1061 + 1062
-- Supabase SQL Editor · service role
--
-- Gebruik: eerst query-blok CONTROLE uitvoeren, daarna VERWIJDEREN (aparte run).
-- Vervang 'dnerkebablaakdal' door slug uit CONTROLE indien nodig.
-- Na verwijderen: admin → Z-rapport → fiscale dag → Vernieuwen.
-- =============================================================================

-- ########## CONTROLE — alleen dit selecteren en Run ##########

SELECT tenant_slug, business_name
FROM tenant_settings
WHERE tenant_slug IN ('dnerkebablaakdal', 'donerkebablaakdal')
   OR business_name ILIKE '%laakdal%';

SELECT tenant_slug, id, order_number, status, payment_status, payment_method, total,
       created_at AT TIME ZONE 'Europe/Brussels' AS created_brussels
FROM orders
WHERE tenant_slug = 'dnerkebablaakdal'
  AND order_number IN (1061, 1062)
ORDER BY order_number;

SELECT oi.order_id, o.order_number, oi.product_name, oi.quantity, oi.total_price
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.tenant_slug = 'dnerkebablaakdal'
  AND o.order_number IN (1061, 1062)
ORDER BY o.order_number;

SELECT DISTINCT
  tenant_slug,
  (created_at AT TIME ZONE 'Europe/Brussels')::date AS z_rapport_dag_vernieuwen
FROM orders
WHERE tenant_slug = 'dnerkebablaakdal'
  AND order_number IN (1061, 1062);

-- ########## VERWIJDEREN — alleen na goede CONTROLE ##########

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

SELECT tenant_slug, order_number, COUNT(*) AS remaining_must_be_zero
FROM orders
WHERE tenant_slug = 'dnerkebablaakdal'
  AND order_number IN (1061, 1062)
GROUP BY tenant_slug, order_number;

COMMIT;

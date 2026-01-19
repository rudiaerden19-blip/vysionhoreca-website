-- FIX_ORDER_NUMBERS.sql
-- Dit script fixt corrupte bestelnummers in de orders tabel

-- Stap 1: Bekijk eerst welke orders corrupte nummers hebben
SELECT id, tenant_slug, order_number, customer_name, created_at
FROM orders
WHERE order_number > 9999 OR order_number < 1001
ORDER BY created_at DESC
LIMIT 50;

-- Stap 2: Update corrupte order nummers naar een geldig bereik
-- We genereren nieuwe nummers gebaseerd op de volgorde van aanmaak
WITH numbered_orders AS (
  SELECT 
    id,
    tenant_slug,
    ROW_NUMBER() OVER (PARTITION BY tenant_slug ORDER BY created_at) + 1000 as new_order_number
  FROM orders
  WHERE order_number > 9999 OR order_number < 1001
)
UPDATE orders
SET order_number = numbered_orders.new_order_number
FROM numbered_orders
WHERE orders.id = numbered_orders.id;

-- Stap 3: Verifieer dat alle orders nu geldige nummers hebben
SELECT tenant_slug, MIN(order_number) as min_num, MAX(order_number) as max_num, COUNT(*) as total_orders
FROM orders
GROUP BY tenant_slug
ORDER BY tenant_slug;

-- Stap 4: Maak een constraint om toekomstige problemen te voorkomen (optioneel)
-- ALTER TABLE orders ADD CONSTRAINT valid_order_number CHECK (order_number >= 1001 AND order_number <= 9999);

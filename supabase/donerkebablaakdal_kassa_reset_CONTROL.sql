-- Dr. Ner Kebab Laakdal — ALLEEN LEZEN (controle vóór wipe)
-- Supabase SQL Editor · postgres / service role
-- Draai alles in één keer; negeer geen errors — meld de exacte foutregel als iets blijft falen.

-- ========== STAP 0: juiste tenant? ==========
SELECT tenant_slug, business_name, email, phone
FROM tenant_settings
WHERE tenant_slug = 'donerkebablaakdal'
   OR tenant_slug ILIKE '%laakdal%';

-- Verwacht exact één rij: donerkebablaakdal

-- ========== STAP 1: kern-tellingen (2 kolommen — geen UNION type-conflict) ==========
SELECT 'orders (alle)' AS tbl, COUNT(*) AS n
FROM orders
WHERE tenant_slug = 'donerkebablaakdal'
UNION ALL
SELECT 'z_reports', COUNT(*)
FROM z_reports
WHERE tenant_slug = 'donerkebablaakdal'
UNION ALL
SELECT 'daily_sales', COUNT(*)
FROM daily_sales
WHERE tenant_slug = 'donerkebablaakdal'
UNION ALL
SELECT 'kassa_name_tabs', COUNT(*)
FROM kassa_name_tabs
WHERE tenant_slug = 'donerkebablaakdal';

-- ========== STAP 1b: order_items (apart — subquery kan traag zijn maar stabiel) ==========
SELECT COUNT(*) AS order_items_n
FROM order_items oi
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.id = oi.order_id AND o.tenant_slug = 'donerkebablaakdal'
);

-- ========== STAP 1c: optionele tabellen (fout = migratie nog niet op DB → overslaan) ==========
-- kassa_on_account (legacy)
SELECT 'kassa_on_account' AS tbl, COUNT(*) AS n
FROM kassa_on_account
WHERE tenant_slug = 'donerkebablaakdal';

-- kassa_jeton_day_sales
SELECT 'kassa_jeton_day_sales' AS tbl, COUNT(*) AS n
FROM kassa_jeton_day_sales
WHERE tenant_slug = 'donerkebablaakdal';

-- tenant_kasboek_manual_lines
SELECT 'tenant_kasboek_manual_lines' AS tbl, COUNT(*) AS n
FROM tenant_kasboek_manual_lines
WHERE tenant_slug = 'donerkebablaakdal';

-- cashbook (digitaal kasboek)
SELECT 'cashbook_days' AS tbl, COUNT(*) AS n
FROM cashbook_days
WHERE tenant_slug = 'donerkebablaakdal';

SELECT 'cashbook_movements' AS tbl, COUNT(*) AS n
FROM cashbook_movements
WHERE tenant_slug = 'donerkebablaakdal';

-- staff klok open
SELECT 'staff_clock_sessions (open)' AS tbl, COUNT(*) AS n
FROM staff_clock_sessions
WHERE tenant_slug = 'donerkebablaakdal'
  AND clock_out_at IS NULL;

-- ========== STAP 2: open tafelmanden (zonder floor_plan_zone — niet overal gemigreerd) ==========
SELECT id, order_number, status, table_number, total, created_at
FROM orders
WHERE tenant_slug = 'donerkebablaakdal'
  AND status IN ('pending', 'confirmed', 'preparing')
ORDER BY created_at DESC
LIMIT 50;

-- ========== STAP 3: laatste Z-dagen ==========
SELECT report_date, total, order_count, created_at
FROM z_reports
WHERE tenant_slug = 'donerkebablaakdal'
ORDER BY report_date DESC
LIMIT 20;

-- ========== STAP 4: kassa POS state (tabel kan ontbreken op oude DB) ==========
SELECT tenant_slug, active_staff_name, bar_bon_watermarks, updated_at
FROM kassa_pos_state
WHERE tenant_slug = 'donerkebablaakdal';

-- ========== STAP 5: X-begin (minimaal — extra kolommen optioneel hieronder) ==========
SELECT tenant_slug, report_register_opening_cash
FROM tenant_settings
WHERE tenant_slug = 'donerkebablaakdal';

-- Optioneel (fout → kolom nog niet gemigreerd):
-- SELECT kasboek_opening_balance, kasboek_opening_balance_date, z_report_month_sent
-- FROM tenant_settings WHERE tenant_slug = 'donerkebablaakdal';

-- ========== STAP 6: andere tenants (sanity) ==========
SELECT tenant_slug, COUNT(*) AS orders_n
FROM orders
WHERE tenant_slug <> 'donerkebablaakdal'
GROUP BY tenant_slug
ORDER BY orders_n DESC
LIMIT 5;

-- Café Marquise — volledige kassa + Z-rapport testdata leeg (GEEN andere tenants).
-- Draai in Supabase SQL Editor (Dashboard → SQL). Gebruik postgres/service role als DELETE geblokkeerd is.
-- Daarna in admin: Z-rapport → Vernieuwen (hard refresh).

-- ========== STAP 0: controle slug ==========
SELECT tenant_slug, business_name
FROM tenant_settings
WHERE tenant_slug ILIKE '%marquise%';

-- Verwacht: cafemarquise

BEGIN;

-- ========== STAP 1: telling vóór wipe ==========
SELECT 'orders (alle)' AS tbl, COUNT(*) AS n
FROM orders
WHERE tenant_slug = 'cafemarquise'
UNION ALL
SELECT 'z_reports', COUNT(*)
FROM z_reports
WHERE tenant_slug = 'cafemarquise'
UNION ALL
SELECT 'daily_sales', COUNT(*)
FROM daily_sales
WHERE tenant_slug = 'cafemarquise'
UNION ALL
SELECT 'kassa_name_tabs', COUNT(*)
FROM kassa_name_tabs
WHERE tenant_slug = 'cafemarquise'
UNION ALL
SELECT 'kassa_on_account (legacy)', COUNT(*)
FROM kassa_on_account
WHERE tenant_slug = 'cafemarquise'
UNION ALL
SELECT 'staff_clock open', COUNT(*)
FROM staff_clock_sessions
WHERE tenant_slug = 'cafemarquise'
  AND clock_out_at IS NULL;

-- ========== STAP 2: op rekening v2 + legacy tabs ==========
DELETE FROM kassa_name_tabs
WHERE tenant_slug = 'cafemarquise';

DELETE FROM kassa_on_account
WHERE tenant_slug = 'cafemarquise';

-- ========== STAP 3: alle bestellingen (kassa + webshop + op-rekening betaling) ==========
-- Sidebar Z-rapport "Bestellingen (systeem)" komt uit orders, niet alleen kassa_client_uuid.
DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM orders WHERE tenant_slug = 'cafemarquise'
);

DELETE FROM orders
WHERE tenant_slug = 'cafemarquise';

-- ========== STAP 4: opgeslagen Z-dagen + handmatige kassa-invoer ==========
DELETE FROM z_reports
WHERE tenant_slug = 'cafemarquise';

DELETE FROM daily_sales
WHERE tenant_slug = 'cafemarquise';

-- ========== STAP 5: open kloksessies sluiten ==========
UPDATE staff_clock_sessions
SET
  clock_out_at = COALESCE(clock_out_at, NOW()),
  updated_at = NOW()
WHERE tenant_slug = 'cafemarquise'
  AND clock_out_at IS NULL;

-- ========== STAP 6: telling na wipe (alles 0) ==========
SELECT 'orders (alle)' AS tbl, COUNT(*) AS n
FROM orders
WHERE tenant_slug = 'cafemarquise'
UNION ALL
SELECT 'z_reports', COUNT(*)
FROM z_reports
WHERE tenant_slug = 'cafemarquise'
UNION ALL
SELECT 'daily_sales', COUNT(*)
FROM daily_sales
WHERE tenant_slug = 'cafemarquise'
UNION ALL
SELECT 'kassa_name_tabs', COUNT(*)
FROM kassa_name_tabs
WHERE tenant_slug = 'cafemarquise';

COMMIT;

-- Lokaal op kassa-apparaat (optioneel): browser cache leeg of incognito — tafelmand kan in localStorage staan.

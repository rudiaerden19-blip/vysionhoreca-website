-- ─────────────────────────────────────────────────────────────────────────────
-- Kassa / plattegrond — GO-LIVE VERIFICATIE (alleen lezen; veilig in SQL Editor)
--
-- Voer uit op de Supabase-projectdatabase van de klant vóór eerste live kassa-dag.
-- Verwacht: elke check hieronder levert rijen (PASS) of géén rijen (FAIL → migratie).
--
-- Vereiste migratie (minimaal): migrations/20260511120000_floor_plan_zones_terrace.sql
-- RLS lockdown (apart): 20260510130000_phase2c_lockdown_zreports_customers_marketing.sql
--   alleen als admin-pagina's al via adminDb-read werken.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Kolommen orders (tafelmand + zone)
SELECT 'PASS orders.floor_plan_zone' AS check_id
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'floor_plan_zone'
);

SELECT 'PASS orders.table_number' AS check_id
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'table_number'
);

-- 2) Één open mand per tafel per zone (partial unique index)
SELECT 'PASS idx_orders_one_open_table_per_zone' AS check_id
WHERE EXISTS (
  SELECT 1 FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'orders'
    AND indexname = 'idx_orders_one_open_table_per_zone'
);

-- 3) Plattegrond per zone (kolom plan_zone — samen met PK-migratie)
SELECT 'PASS floor_plan_tables.plan_zone' AS check_id
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'floor_plan_tables' AND column_name = 'plan_zone'
);

-- 4) Optioneel: decor ook per zone (als tabel bestaat)
SELECT 'PASS floor_plan_decor.plan_zone (of tabel ontbreekt)' AS check_id
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'floor_plan_decor'
)
OR EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'floor_plan_decor' AND column_name = 'plan_zone'
);

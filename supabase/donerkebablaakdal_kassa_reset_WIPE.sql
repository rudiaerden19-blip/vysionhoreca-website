-- Dr. Ner Kebab Laakdal — WIPE kassa + Z + gerelateerde omzet (ALLEEN deze tenant)
-- Draai eerst: donerkebablaakdal_kassa_reset_CONTROL.sql
-- Supabase SQL Editor · postgres / service role
-- NA wipe: admin Z-rapport hard refresh; kassa-pc eventueel cache/incognito (localStorage tafelmand).

-- ========== STAP 0: slug nog eens checken ==========
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tenant_settings WHERE tenant_slug = 'donerkebablaakdal'
  ) THEN
    RAISE EXCEPTION 'tenant donerkebablaakdal niet gevonden — STOP';
  END IF;
END $$;

BEGIN;

-- ========== STAP 1: telling vóór wipe ==========
SELECT 'orders' AS tbl, COUNT(*) AS n
FROM orders
WHERE tenant_slug = 'donerkebablaakdal';

-- ========== STAP 2: op rekening ==========
DELETE FROM kassa_name_tabs
WHERE tenant_slug = 'donerkebablaakdal';

DO $$
BEGIN
  IF to_regclass('public.kassa_on_account') IS NOT NULL THEN
    DELETE FROM kassa_on_account WHERE tenant_slug = 'donerkebablaakdal';
  END IF;
END $$;

-- ========== STAP 3: kasboek / cashbook (tenant) — overslaan als tabel ontbreekt ==========
DO $$
BEGIN
  IF to_regclass('public.tenant_kasboek_manual_lines') IS NOT NULL THEN
    DELETE FROM tenant_kasboek_manual_lines WHERE tenant_slug = 'donerkebablaakdal';
  END IF;
  IF to_regclass('public.cashbook_movements') IS NOT NULL THEN
    DELETE FROM cashbook_movements WHERE tenant_slug = 'donerkebablaakdal';
    DELETE FROM cashbook_adjustments WHERE tenant_slug = 'donerkebablaakdal';
    DELETE FROM cashbook_audit_log WHERE tenant_slug = 'donerkebablaakdal';
    DELETE FROM cashbook_days WHERE tenant_slug = 'donerkebablaakdal';
  END IF;
  IF to_regclass('public.kassa_jeton_day_sales') IS NOT NULL THEN
    DELETE FROM kassa_jeton_day_sales WHERE tenant_slug = 'donerkebablaakdal';
  END IF;
END $$;

-- ========== STAP 4: bestellingen (kassa + webshop + open tafels) ==========
DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM orders WHERE tenant_slug = 'donerkebablaakdal'
);

DELETE FROM orders
WHERE tenant_slug = 'donerkebablaakdal';

-- ========== STAP 5: Z-rapporten + handmatige dagomzet ==========
DELETE FROM z_reports
WHERE tenant_slug = 'donerkebablaakdal';

DELETE FROM daily_sales
WHERE tenant_slug = 'donerkebablaakdal';

-- ========== STAP 6: kassa POS state (geen open tafel-watermarks) ==========
DO $$
BEGIN
  IF to_regclass('public.kassa_pos_state') IS NOT NULL THEN
    INSERT INTO kassa_pos_state (tenant_slug, bar_bon_watermarks, updated_at)
    VALUES ('donerkebablaakdal', '{}'::jsonb, NOW())
    ON CONFLICT (tenant_slug) DO UPDATE SET
      bar_bon_watermarks = '{}'::jsonb,
      updated_at = NOW();
  END IF;
END $$;

-- ========== STAP 7: X-begin in tenant_settings (kolommen best-effort) ==========
UPDATE tenant_settings
SET report_register_opening_cash = 0
WHERE tenant_slug = 'donerkebablaakdal';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_settings'
      AND column_name = 'kasboek_opening_balance'
  ) THEN
    UPDATE tenant_settings
    SET kasboek_opening_balance = 0,
        kasboek_opening_balance_date = NULL
    WHERE tenant_slug = 'donerkebablaakdal';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_settings'
      AND column_name = 'z_report_month_sent'
  ) THEN
    UPDATE tenant_settings
    SET z_report_month_sent = '{}'::jsonb
    WHERE tenant_slug = 'donerkebablaakdal';
  END IF;
END $$;

-- ========== STAP 8: open kloksessies sluiten ==========
DO $$
BEGIN
  IF to_regclass('public.staff_clock_sessions') IS NOT NULL THEN
    UPDATE staff_clock_sessions
    SET
      clock_out_at = COALESCE(clock_out_at, NOW()),
      updated_at = NOW()
    WHERE tenant_slug = 'donerkebablaakdal'
      AND clock_out_at IS NULL;
  END IF;
END $$;

-- ========== STAP 9: optioneel — wachtrij cloud print ==========
DO $$
BEGIN
  IF to_regclass('public.print_agent_jobs') IS NOT NULL THEN
    DELETE FROM print_agent_jobs WHERE tenant_slug = 'donerkebablaakdal';
  END IF;
END $$;

-- ========== STAP 10: telling na wipe (verwacht 0) ==========
SELECT 'orders' AS tbl, COUNT(*) AS n
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
WHERE tenant_slug = 'donerkebablaakdal'
UNION ALL
SELECT 'tenant_kasboek_manual_lines', COUNT(*)
FROM tenant_kasboek_manual_lines
WHERE tenant_slug = 'donerkebablaakdal';

COMMIT;

-- NIET gewist (bewust): menu, tenant_settings (behalve kasboek/X velden), plattegrond JSON,
-- medewerkers, reservaties, marketing — alleen verkoop/Z/kassa-state hierboven.

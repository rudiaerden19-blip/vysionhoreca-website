-- =============================================================================
--  PHASE 2 STEP 2 · HR + BOEKHOUDING-LOCKDOWN
-- =============================================================================
--  Sluit anon SELECT-toegang voor:
--    HR / personeel:    staff, staff_clock_sessions, timesheet_entries,
--                       monthly_timesheets, leave_requests, staff_timesheet
--    Boekhouding:       tenant_kasboek_manual_lines, tenant_kasboek_orders,
--                       fixed_costs, variable_costs, cost_categories,
--                       cost_settings, ingredients, product_ingredients,
--                       invoice_scans, invoice_scan_items, business_targets,
--                       business_analysis
--    Fiscaal lichte:    daily_sales (jaaromzet)
--
--  Voorwaarde: deploy moet eerst LIVE zijn met:
--    · admin-api.ts staff/timesheet/cost-functies via adminDb
--    · admin-pagina's (kasboek, kosten/*, analyse, dashboard/analyse) via
--      adminDb.select
--    · /api/admin/db/read als generieke server-side read-proxy
--
--  Voer dit pas uit ALS de bovenstaande deploy live is. Anders zien admin-
--  pagina's lege dashboards (zelfde patroon als de eerder regressie).
-- =============================================================================

BEGIN;

DO $$
DECLARE
  t text;
  pname text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    -- HR
    'staff','staff_clock_sessions','timesheet_entries','monthly_timesheets',
    'leave_requests','staff_timesheet',
    -- Boekhouding
    'tenant_kasboek_manual_lines','tenant_kasboek_orders',
    'fixed_costs','variable_costs','cost_categories','cost_settings',
    'ingredients','product_ingredients',
    'invoice_scans','invoice_scan_items',
    'business_targets','business_analysis',
    -- Fiscaal lichte
    'daily_sales'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      pname := t || '_public_read';
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pname, t);
    END IF;
  END LOOP;
END$$;

-- Verifieer: geen public_read policies meer over op deze tabellen.
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
   WHERE c.relname IN (
     'staff','staff_clock_sessions','timesheet_entries','monthly_timesheets',
     'leave_requests','staff_timesheet',
     'tenant_kasboek_manual_lines','tenant_kasboek_orders',
     'fixed_costs','variable_costs','cost_categories','cost_settings',
     'ingredients','product_ingredients',
     'invoice_scans','invoice_scan_items',
     'business_targets','business_analysis',
     'daily_sales'
   )
     AND p.polname LIKE '%public_read%';
  IF cnt > 0 THEN
    RAISE EXCEPTION 'Er staan nog public_read policies — controleer met: SELECT polname, polrelid::regclass FROM pg_policy WHERE polname LIKE %s', '''%public_read%''';
  END IF;
END$$;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATIE (in browser, op admin-pagina's):
--   · Personeel & Uren            → moeten gevuld zijn
--   · Kasboek                     → manual lines tab moet vol staan
--   · Kosten/Instellingen         → categorieën zichtbaar
--   · Kosten/Ingredienten         → ingredient-lijst zichtbaar
--   · Kosten/Producten            → producten + ingredients + cost_settings
--   · Analyse                     → dashboards berekenen normaal
--
-- Als IETS leeg is: deploy was nog niet live tijdens SQL-run.
-- Hard refresh, daarna nogmaals proberen.
-- ─────────────────────────────────────────────────────────────────────────────

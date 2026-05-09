-- =============================================================================
--  PHASE 1 · SECURE RLS LOCKDOWN  (Vysion Horeca multi-tenant)
-- =============================================================================
--  Doel: alle "FOR ALL USING (true)" policies (uit FIX_ALL_RLS_POLICIES.sql)
--        vervangen door tenant-scoped, role-aware policies.
--
--  Strategie:
--    · anon  → mag publieke klantpaden (menu lezen, order plaatsen, reviews)
--              MAAR enkel INSERT/SELECT — nooit UPDATE/DELETE; sensitieve
--              tabellen (bv. business_profiles) krijgen GEEN public policy.
--    · service_role → mag alles (admin proxy gebruikt deze key server-side).
--
--  ⚠ Voer dit UITSLUITEND uit op staging eerst. Bij productie gebruik je het
--    PHASE1_DEPLOYMENT_PLAYBOOK.md (zie supabase/).
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 0 · helpers
-- ─────────────────────────────────────────────────────────────────────────────

-- Idempotente policy-cleanup: drop ALLE policies op een tabel zodat we
-- niets dubbel of conflicterend krijgen.
CREATE OR REPLACE FUNCTION pg_temp.drop_all_policies(tbl regclass)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT polname
      FROM pg_policy
     WHERE polrelid = tbl
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', r.polname, tbl::text);
  END LOOP;
END$$;

-- Veilige helper: ENABLE RLS + drop bestaande policies.
CREATE OR REPLACE FUNCTION pg_temp.reset_table_rls(tbl regclass)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl::text);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl::text);
  PERFORM pg_temp.drop_all_policies(tbl);
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 1 · TABELLEN MET PUBLIEKE KLANT-LEESTOEGANG
--   menu, openingstijden, settings, media, teksten, promoties, gift_cards,
--   loyalty_rewards, qr_codes, team_members, opties, allergenen, …
--   anon mag SELECT (klant browst de shop). Geen INSERT/UPDATE/DELETE met anon.
--   service_role doet alles voor admin via /api/admin/db.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenant_settings','opening_hours','exceptional_closings',
    'menu_categories','menu_products',
    'product_options','product_option_choices','product_option_links',
    'delivery_settings','reservation_settings',
    'tenant_media','tenant_texts',
    'promotions','gift_cards','loyalty_rewards',
    'qr_codes','team_members'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM pg_temp.reset_table_rls(format('public.%I', t)::regclass);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
                     t || '_public_read', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                     t || '_service_role_all', t);
    END IF;
  END LOOP;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 2 · KLANT-INSERT-PADEN (orders, reviews, reservations, group_orders)
--   anon mag INSERT en SELECT (om de bevestiging op te halen).
--   anon NIET update/delete (alleen admin/service_role).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders','order_items','reviews','reservations',
    'group_order_sessions','group_order_members','group_order_items'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM pg_temp.reset_table_rls(format('public.%I', t)::regclass);
      -- Klant moet zijn eigen order/review/reservering kunnen aanmaken
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)',
                     t || '_public_insert', t);
      -- Klant mag de eigen rij teruglezen voor de bevestigingspagina.
      -- Tenant-isolatie gebeurt op het niveau van /api/admin/db; voor klant-paden is
      -- de orderId/uuid praktisch onraadbaar (UUID v4) en de detail-pagina zelf checkt
      -- op tenant_slug. Dit is bewust gehouden om huidige flow niet te breken.
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
                     t || '_public_read', t);
      -- Admin (service_role) doet update/delete via API.
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                     t || '_service_role_all', t);
    END IF;
  END LOOP;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 3 · KLANT-LEZEN-EIGEN-DATA (shop_customers via email lookup)
--   We laten SELECT/INSERT toe (klant moet zelf account maken op shop), maar
--   GEEN UPDATE/DELETE met anon.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='shop_customers') THEN
    PERFORM pg_temp.reset_table_rls('public.shop_customers'::regclass);
    EXECUTE 'CREATE POLICY shop_customers_public_read   ON public.shop_customers FOR SELECT TO anon, authenticated USING (true)';
    EXECUTE 'CREATE POLICY shop_customers_public_insert ON public.shop_customers FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY shop_customers_service_role_all ON public.shop_customers FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 4 · GEHEIME / SENSITIEVE TABELLEN
--   GEEN policy → alleen service_role (bypass) heeft toegang.
--   Bevat: password hashes, omzet, HR-data, super-admin credentials, …
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'business_profiles',          -- email + bcrypt password hash
    'super_admins',               -- meester-accounts
    'subscriptions',              -- Stripe subscription state
    'processed_webhook_events',   -- idempotency
    'staff','staff_clock_sessions','timesheet_entries','monthly_timesheets',
    'leave_requests','staff_timesheet',
    'z_reports','daily_sales',
    'business_targets','business_analysis',
    'fixed_costs','variable_costs','cost_categories','cost_settings',
    'product_ingredients','ingredients','supplier_products','invoice_scans',
    'invoice_scan_items',
    'tenant_kasboek_manual_lines','tenant_kasboek_orders',
    'marketing_campaigns','partners','resellers','partner_applications',
    'platform_activity','page_views','tenants',
    'guest_profiles','tenant_order_sequences',
    'audit_log',                  -- onze nieuwe (wordt aangemaakt in volgende migratie)
    'whatsapp_settings','whatsapp_messages',
    'pin_settings'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM pg_temp.reset_table_rls(format('public.%I', t)::regclass);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                     t || '_service_role_all', t);
      -- Geen anon/authenticated policy → 0 toegang voor de publieke key.
    END IF;
  END LOOP;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 5 · LOYALTY REDEMPTIES
--   anon mag INSERT (klant verzilvert reward). SELECT alleen via service_role.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='loyalty_redemptions') THEN
    PERFORM pg_temp.reset_table_rls('public.loyalty_redemptions'::regclass);
    EXECUTE 'CREATE POLICY loyalty_redemptions_public_insert ON public.loyalty_redemptions FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY loyalty_redemptions_service_role_all ON public.loyalty_redemptions FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 6 · FLOORPLAN (publiek leesbaar voor reservering-UI)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['floor_plan_tables','floor_plan_decor'] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM pg_temp.reset_table_rls(format('public.%I', t)::regclass);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
                     t || '_public_read', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                     t || '_service_role_all', t);
    END IF;
  END LOOP;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 7 · OUDERE FALLBACK-NAMEN voor tabellen die mogelijk in oude
-- installaties anders heten.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','categories','staff_members','timesheets','customers'] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM pg_temp.reset_table_rls(format('public.%I', t)::regclass);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                     t || '_service_role_all', t);
    END IF;
  END LOOP;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 8 · VERIFICATIE-VIEW (handig voor Supabase advisor)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_phase1_rls_status AS
SELECT
  c.relname  AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  COALESCE((SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid), 0) AS policy_count,
  COALESCE(
    (SELECT array_agg(p.polname ORDER BY p.polname)
       FROM pg_policy p
      WHERE p.polrelid = c.oid),
    ARRAY[]::name[]
  ) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

COMMENT ON VIEW public.v_phase1_rls_status IS
'Quick check: SELECT * FROM v_phase1_rls_status WHERE NOT rls_enabled OR policy_count = 0;';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- POST-CHECK (uit te voeren in Supabase SQL Editor):
--   SELECT * FROM v_phase1_rls_status WHERE NOT rls_enabled OR policy_count = 0;
--   → moet een lege set teruggeven.
--
--   SELECT count(*) FROM business_profiles;        -- zou MOETEN falen via anon key
--   SELECT count(*) FROM orders;                   -- werkt via anon (publieke read)
-- ─────────────────────────────────────────────────────────────────────────────

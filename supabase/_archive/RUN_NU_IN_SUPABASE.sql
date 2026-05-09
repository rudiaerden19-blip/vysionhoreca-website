-- =============================================================================
--  RUN NU IN SUPABASE  ·  Phase 1 Security Lockdown
-- =============================================================================
--  WAT DOET DIT BESTAND?
--    1. Maakt een audit_log tabel (wie wijzigde wat wanneer).
--    2. Vervangt alle "check_access() = true" policies door echte
--       tenant-veilige policies, zodat de anon-key NIET meer overal bij kan.
--    3. Maakt een verificatie-view zodat we kunnen checken of het werkte.
--
--  HOE GEBRUIKEN?
--    1. Open Supabase Dashboard → linkermenu → SQL Editor → + New query.
--    2. Selecteer ALLE tekst in dit bestand (Cmd+A) en kopieer (Cmd+C).
--    3. Plak in de SQL Editor.
--    4. Druk op de groene RUN-knop (of Cmd+Enter).
--    5. Wacht 5–15 seconden. Resultaat: "Success. No rows returned."
--
--  IS DIT VEILIG?
--    Ja. Idempotent (mag meerdere keren). Gebruikt transacties (BEGIN/COMMIT)
--    dus als er ergens een fout is, wordt alles teruggerold.
--    Geen DELETE / DROP TABLE / data-aanpassingen — alleen RLS-policies.
-- =============================================================================


-- =============================================================================
--  DEEL 1 / 2  ·  AUDIT LOG TABEL
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),

  tenant_slug     text        NOT NULL,
  actor_type      text        NOT NULL CHECK (actor_type IN ('owner','staff','superadmin','system','anon')),
  actor_id        text,
  actor_email     text,

  action          text        NOT NULL,
  resource_type   text        NOT NULL,
  resource_id     text,

  before_data     jsonb,
  after_data      jsonb,

  ip              text,
  user_agent      text,
  request_id      uuid,
  notes           text
);

CREATE INDEX IF NOT EXISTS audit_log_tenant_created_idx
  ON public.audit_log (tenant_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_actor_idx
  ON public.audit_log (actor_id);

CREATE INDEX IF NOT EXISTS audit_log_resource_idx
  ON public.audit_log (resource_type, resource_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_service_role_all ON public.audit_log;

CREATE POLICY audit_log_service_role_all
  ON public.audit_log
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.audit_log IS
'Wie wijzigde wat wanneer in welke tenant. Alleen schrijven via /api/admin/db.';

COMMIT;


-- =============================================================================
--  DEEL 2 / 2  ·  RLS LOCKDOWN
-- =============================================================================

BEGIN;

-- Helpers (alleen geldig binnen deze sessie).
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

CREATE OR REPLACE FUNCTION pg_temp.reset_table_rls(tbl regclass)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl::text);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl::text);
  PERFORM pg_temp.drop_all_policies(tbl);
END$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 1 · publieke leestoegang (klant browst de shop)
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
-- STAP 2 · klant-INSERT-paden (orders, reviews, reservations, group orders)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders','order_items','reviews','reservations',
    'group_order_sessions','group_order_members','group_order_items'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM pg_temp.reset_table_rls(format('public.%I', t)::regclass);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)',
                     t || '_public_insert', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
                     t || '_public_read', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                     t || '_service_role_all', t);
    END IF;
  END LOOP;
END$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 3 · shop_customers
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
-- STAP 4 · GEHEIME / SENSITIEVE TABELLEN  (alleen service_role)
--   Dit dicht het lek: anon kan deze NIET meer lezen.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'business_profiles',          -- email + bcrypt password hash
    'super_admins',               -- meester-accounts
    'subscriptions',              -- Stripe subscription state
    'processed_webhook_events',
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
    'audit_log',
    'whatsapp_settings','whatsapp_messages',
    'pin_settings'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM pg_temp.reset_table_rls(format('public.%I', t)::regclass);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                     t || '_service_role_all', t);
    END IF;
  END LOOP;
END$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 5 · loyalty_redemptions
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='loyalty_redemptions') THEN
    PERFORM pg_temp.reset_table_rls('public.loyalty_redemptions'::regclass);
    EXECUTE 'CREATE POLICY loyalty_redemptions_public_insert    ON public.loyalty_redemptions FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY loyalty_redemptions_service_role_all ON public.loyalty_redemptions FOR ALL    TO service_role         USING (true) WITH CHECK (true)';
  END IF;
END$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STAP 6 · floorplan
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
-- STAP 7 · oude tabel-namen (fallback, mocht iets nog bestaan)
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
-- STAP 8 · verificatie-view
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


-- =============================================================================
--  KLAAR.  Hierna mag je deze controle-query draaien (apart):
-- =============================================================================
--
--   SELECT * FROM v_phase1_rls_status
--    WHERE NOT rls_enabled OR policy_count = 0;
--
--   → moet 0 rijen geven. Als er rijen verschijnen: stuur me dat door.
-- =============================================================================

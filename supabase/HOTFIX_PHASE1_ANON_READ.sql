-- =============================================================================
--  PHASE 1 HOTFIX · ANON SELECT RESTORE
-- =============================================================================
--  Probleem: phase1_secure_rls_lockdown.sql heeft per ongeluk ook de READ-kant
--            van admin-tabellen geblokkeerd voor anon. Resultaat: z-rapport
--            archief leeg, kasboek leeg, kostenpagina leeg, etc.
--
--  Oplossing: voeg een SELECT-policy toe voor anon (en authenticated) op de
--             admin-tabellen die de UI met de browser-client (anon key) leest.
--             WRITE blijft service-role-only (via /api/admin/db proxy) → de
--             beveiligingswinst van Phase 1 blijft behouden voor mutaties.
--
--  Wat blijft GESLOTEN voor anon (echt gevoelig):
--    business_profiles, super_admins, subscriptions, processed_webhook_events,
--    audit_log, partner_applications, partners, resellers
--
--  Voer dit uit in Supabase SQL Editor.
-- =============================================================================

BEGIN;

-- Helper: voegt een anon-SELECT policy toe als ze nog niet bestaat
-- (idempotent: kan herhaaldelijk gerund worden zonder fout).
DO $$
DECLARE
  t text;
  pname text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    -- Z-rapport / fiscale data (kritiek voor Belgische GKS-compliance)
    'z_reports','daily_sales',
    -- Kasboek
    'tenant_kasboek_manual_lines','tenant_kasboek_orders',
    -- Kosten / boekhouding / ingredienten
    'business_targets','business_analysis',
    'fixed_costs','variable_costs','cost_categories','cost_settings',
    'product_ingredients','ingredients','supplier_products',
    'invoice_scans','invoice_scan_items',
    -- HR / personeel (read voor dashboard)
    'staff','staff_clock_sessions','timesheet_entries','monthly_timesheets',
    'leave_requests','staff_timesheet',
    -- Reservering-data
    'guest_profiles',
    -- Sequence-counters (publiek leesbaar voor klantbestelling-numbering)
    'tenant_order_sequences',
    -- Marketing dashboards
    'marketing_campaigns',
    -- Tenant-tabel (read-only voor branding/login flows)
    'tenants',
    -- WhatsApp & PIN (admin-read)
    'whatsapp_settings','whatsapp_messages','pin_settings',
    -- Analytics
    'platform_activity','page_views'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      pname := t || '_public_read';
      -- Drop bestaande gelijknamige policy om hard idempotent te zijn
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pname, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
        pname, t
      );
    END IF;
  END LOOP;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- BLIJFT GESLOTEN voor anon (geen wijziging — alleen service_role):
--   business_profiles  → wachtwoord-hashes
--   super_admins       → meester-accounts
--   subscriptions      → Stripe state (kan leiden tot account-overname)
--   processed_webhook_events
--   audit_log          → privacy van mutatie-spoor
--   partner_applications, partners, resellers → commerciële data
-- ─────────────────────────────────────────────────────────────────────────────

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATIE: alle admin-leestabellen moeten nu policy_count >= 2 hebben
-- (1 anon-SELECT + 1 service_role-ALL).
-- ─────────────────────────────────────────────────────────────────────────────
SELECT table_name, policy_count, policies
  FROM v_phase1_rls_status
 WHERE table_name IN (
   'z_reports','daily_sales','tenant_kasboek_manual_lines','tenant_kasboek_orders',
   'fixed_costs','variable_costs','cost_categories','ingredients',
   'product_ingredients','invoice_scans','staff','guest_profiles','tenants'
 )
 ORDER BY table_name;

-- En een steekproef: kunnen we als anon nu z_reports lezen?
--   (kan je niet rechtstreeks testen in SQL Editor want die draait als
--    postgres/owner — test in de UI op de z-rapport pagina.)

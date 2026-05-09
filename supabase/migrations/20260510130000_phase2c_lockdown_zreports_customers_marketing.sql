-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2-C — Lockdown anon SELECT op gevoelige zakelijke tabellen
--
-- Doel: na deze migratie kan de Supabase anon-key (in de browser zichtbaar)
-- de volgende tabellen NIET meer rechtstreeks lezen:
--
--   · z_reports             — omzet/sluitings-rapporten per dag
--   · shop_customers        — klantdatabase (e-mail, telefoon, GDPR)
--   · marketing_campaigns   — verzonden campagnes per tenant
--
-- Vereiste vóór uitvoeren:
--   De drie admin-pagina's lezen deze tabellen NIET meer rechtstreeks via
--   `supabase.from(...)` met anon-key. Ze gebruiken nu `adminDb.select(...)`
--   die via /api/admin/db/read met de service-role-client leest na auth.
--   Zie commit "Punt 1a (z_reports)" en "Punt 1b (shop_customers + marketing)".
--
-- Veiligheid bij rollback:
--   Onderaan dit script staat een commentaar met het rollback-statement.
--   Geen DROP TABLE. Geen impact op service_role-policies.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE t text;
DECLARE p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['z_reports','shop_customers','marketing_campaigns'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      RAISE NOTICE 'Tabel public.% bestaat niet — overgeslagen', t;
      CONTINUE;
    END IF;

    -- 1. RLS aan (idempotent).
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- 2. Verwijder elke bestaande anon-SELECT (en alles wat 'public_read'
    --    of '_anon_' in de naam heeft, plus oude FOR ALL-policies).
    FOR p IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = t
        AND (
          policyname LIKE '%public_read%'
          OR policyname LIKE '%anon%'
          OR policyname LIKE '%select_all%'
          OR policyname LIKE '%for_all%'
          OR policyname LIKE '%open%'
        )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;

    -- 3. service_role-policy (idempotent) — admin-API blijft werken.
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        t || '_service_role_all', t
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    -- 4. Trek anon/authenticated-SELECT-grants in (RLS + GRANT zijn twee
    --    verschillende dingen; wij willen beide dicht).
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
    EXECUTE format('REVOKE SELECT ON public.%I FROM authenticated', t);
  END LOOP;
END$$;

-- ── Verificatie ──
-- Verwacht: na deze migratie vind je voor elke tabel ALLEEN een
-- service_role-policy en GEEN anon/authenticated SELECT-rechten meer.
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('z_reports','shop_customers','marketing_campaigns')
ORDER BY tablename, policyname;

SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('z_reports','shop_customers','marketing_campaigns')
  AND grantee IN ('anon','authenticated')
ORDER BY table_name, grantee;

-- ── Rollback (als de admin-UI ineens leeg blijkt te zijn) ──
-- Niet automatisch uitvoeren. Plak handmatig in SQL Editor:
--
--   GRANT SELECT ON public.z_reports TO anon, authenticated;
--   GRANT SELECT ON public.shop_customers TO anon, authenticated;
--   GRANT SELECT ON public.marketing_campaigns TO anon, authenticated;
--   CREATE POLICY z_reports_public_read ON public.z_reports
--     FOR SELECT TO anon, authenticated USING (true);
--   CREATE POLICY shop_customers_public_read ON public.shop_customers
--     FOR SELECT TO anon, authenticated USING (true);
--   CREATE POLICY marketing_campaigns_public_read ON public.marketing_campaigns
--     FOR SELECT TO anon, authenticated USING (true);

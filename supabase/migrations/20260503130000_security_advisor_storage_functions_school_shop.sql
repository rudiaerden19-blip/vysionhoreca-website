-- Security Advisor (staging eerst): school_shop-resten, te ruime storage-policies voor `anon`,
-- en SECURITY DEFINER-functies die nog voor PUBLIC/anon/authenticated callable waren.
--
-- Na uitvoeren: Dashboard → Advisors vernieuwen. Test: groepen aanmaken (RPC), media upload/URL,
-- factuur-flow, kassa ordernummer-trigger.

-- =============================================================================
-- 1) School shop (RLS-warnings verdwijnen met de tabellen / kolom)
-- =============================================================================
ALTER TABLE IF EXISTS public.orders DROP COLUMN IF EXISTS school_shop_week_id;

DROP INDEX IF EXISTS idx_orders_school_shop_week;

DROP TABLE IF EXISTS public.school_shop_week_products CASCADE;
DROP TABLE IF EXISTS public.school_shop_weeks CASCADE;

DROP FUNCTION IF EXISTS public.school_shop_weeks_set_updated_at() CASCADE;

-- =============================================================================
-- 2) Storage: alle policies op storage.objects waar rol `anon` bij hoort
--    Voorkomt anon “listing” / Storage API zonder dat je bucket-config hoeft te raden.
--    Publieke CDN-URLs voor buckets met public=true werken meestal nog steeds.
-- =============================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND 'anon'::name = ANY (roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Alleen nodig als je géén publieke URLs meer wilt (kan shop-afbeeldingen breken):
-- UPDATE storage.buckets SET public = false WHERE id IN ('invoices', 'media');

-- =============================================================================
-- 3) SECURITY DEFINER: EXECUTE intrekken voor clients, daarna minimaal teruggeven
-- =============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT format(
             '%I.%I(%s)',
             n.nspname,
             p.proname,
             pg_catalog.pg_get_function_identity_arguments(p.oid)
           ) AS sig
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname IN (
        'check_access',
        'cleanup_old_webhook_events',
        'cleanup_old_whatsapp_sessions',
        'cleanup_old_whatsapp_messages',
        'generate_group_access_code',
        'generate_partner_code',
        'orders_assign_pos_order_number',
        'sync_tenant_to_business_profile',
        'update_cost_updated_at',
        'update_order_groups_updated_at',
        'update_supplier_products_updated_at',
        'update_whatsapp_updated_at'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

-- RLS policies gebruiken check_access() → anon/authenticated moeten EXECUTE houden.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'check_access'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.check_access() TO anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.check_access() TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.check_access() TO service_role';
  END IF;
END $$;

-- RPC / onderhoud via service role (o.a. src/app/api/groups/route.ts).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'generate_group_access_code'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.generate_group_access_code() TO service_role';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'generate_partner_code'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.generate_partner_code() TO service_role';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'cleanup_old_webhook_events'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.cleanup_old_webhook_events() TO service_role';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'cleanup_old_whatsapp_sessions'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.cleanup_old_whatsapp_sessions() TO service_role';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'cleanup_old_whatsapp_messages'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.cleanup_old_whatsapp_messages() TO service_role';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'sync_tenant_to_business_profile'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.sync_tenant_to_business_profile() TO service_role';
  END IF;
END $$;

-- Triggerfuncties: geen client-RPC nodig; service_role voor tooling/migraties.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'orders_assign_pos_order_number'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.orders_assign_pos_order_number() TO service_role';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_cost_updated_at'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.update_cost_updated_at() TO service_role';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_order_groups_updated_at'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.update_order_groups_updated_at() TO service_role';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_supplier_products_updated_at'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.update_supplier_products_updated_at() TO service_role';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_whatsapp_updated_at'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.update_whatsapp_updated_at() TO service_role';
  END IF;
END $$;

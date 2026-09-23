-- Publieke key (anon / authenticated) mag geen betaalsleutels meer lezen,
-- en mag geen al-betaalde kassa-order meer invoegen.
--
-- SELECT op orders blijft. Het onlinescherm, de kassa-bel en de webshop-checkout
-- lezen die tabel met de publieke key. Die lezing hier weghalen zet die schermen uit.
--
-- service_role (kassa via /api/admin/db, pin, webhooks) blijft alles kunnen.

BEGIN;

-- ── 1. Geheime kolommen: geen SELECT voor de publieke rollen ──────────────
DO $$
DECLARE
  col text;
  secret_cols text[] := ARRAY[
    'stripe_secret_key',
    'stripe_webhook_secret',
    'sumup_api_key',
    'sumup_merchant_code',
    'mollie_api_key',
    'stripe_terminal_access_token',
    'sumup_oauth_refresh_token',
    'mollie_oauth_refresh_token',
    'smtp_password'
  ];
BEGIN
  FOREACH col IN ARRAY secret_cols LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tenant_settings'
        AND column_name = col
    ) THEN
      EXECUTE format(
        'REVOKE SELECT (%I) ON TABLE public.tenant_settings FROM PUBLIC, anon, authenticated',
        col
      );
    END IF;
  END LOOP;
END $$;

-- ── 2. Orders: publieke INSERT beperken tot een open webshop-bestelling ──
-- Alleen INSERT-policies en ALL-policies die niet exclusief service_role zijn.
-- SELECT-policies blijven staan.
DO $$
DECLARE
  r record;
  role_names text;
  dropped_all boolean := false;
BEGIN
  FOR r IN
    SELECT pol.polname, pol.polcmd, pol.polroles
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'orders'
      AND pol.polcmd IN ('a', '*')
  LOOP
    SELECT coalesce(string_agg(rol.rolname, ',' ORDER BY rol.rolname), '')
      INTO role_names
    FROM pg_roles rol
    WHERE rol.oid = ANY (r.polroles);

    IF role_names = 'service_role' THEN
      CONTINUE;
    END IF;

    IF r.polcmd = '*' THEN
      dropped_all := true;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', r.polname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'orders'
      AND pol.polcmd = 'r'
  ) THEN
    CREATE POLICY orders_public_read ON public.orders
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;

  -- Een oude "allow all" gaf ook UPDATE. Die zetten we terug zodat
  -- goedkeuren op het onlinescherm blijft werken. Zonder zo'n policy
  -- (phase 1) maken we géén nieuwe update-policy.
  IF dropped_all AND NOT EXISTS (
    SELECT 1
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'orders'
      AND pol.polcmd = 'w'
  ) THEN
    CREATE POLICY orders_public_update ON public.orders
      FOR UPDATE TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DROP POLICY IF EXISTS orders_public_insert ON public.orders;
CREATE POLICY orders_public_insert ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    coalesce(lower(status), 'new') IN ('new', 'awaiting_payment')
    AND coalesce(lower(payment_status), 'pending') IN ('pending', 'unpaid')
  );

COMMIT;

-- =============================================================================
--  PHASE 2 STEP 1 · GDPR-LOCKDOWN guest_profiles
-- =============================================================================
--  Sluit anon SELECT-toegang tot guest_profiles weer. Klantnaam + telefoon
--  + e-mail zijn persoonsgegevens (GDPR Art. 4) en mogen niet via de
--  publieke anon-key gelezen worden.
--
--  Voorwaarde: deploy moet eerst LIVE zijn met:
--    · /api/admin/db/read       (admin Kassa-pagina leest guest_profiles
--                                voortaan via service-role)
--    · /api/public/guest-profile (klant-reserveringspagina schrijft via
--                                  rate-limited server-endpoint)
--
--  Voer dit pas uit ALS de bovenstaande deploy live is. Anders ziet de
--  Kassa-reservatie tab een lege gastlijst.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS guest_profiles_public_read ON public.guest_profiles;

-- Verifieer: alleen service_role policy mag overblijven.
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
   WHERE c.relname = 'guest_profiles'
     AND p.polname LIKE '%public_read%';

  IF cnt > 0 THEN
    RAISE EXCEPTION 'guest_profiles heeft nog public_read policy(s) — controleer met: SELECT polname FROM pg_policy WHERE polrelid = ''public.guest_profiles''::regclass;';
  END IF;
END$$;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATIE
--
--   1.  SELECT polname, polcmd FROM pg_policy
--         WHERE polrelid = 'public.guest_profiles'::regclass;
--       → enkel guest_profiles_service_role_all (cmd = '*')
--
--   2.  Test in browser-console op de zaak-site (anon key):
--         await fetch('/api/admin/db/read', { … })   → werkt voor admin
--         supabase.from('guest_profiles').select('*') → returneert []
--
--   3.  Test klant-reserveringspagina:
--         maak een test-reservering met telefoon/email →
--         /api/public/guest-profile moet 200 OK geven →
--         in DB komt nieuwe rij in guest_profiles
-- ─────────────────────────────────────────────────────────────────────────────

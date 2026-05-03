-- Security Advisor — resterende 4 meldingen:
--  • Public bucket allows listing (storage.media, storage.invoices)
--  • SECURITY DEFINER + EXECUTE op public.check_access voor anon/authenticated
--
-- check_access hoeft geen DEFINER te zijn (implementatie is alleen RETURN true).
-- Listing komt door brede SELECT op storage.objects (vaak TO public / alle rollen, niet alleen anon).

-- =============================================================================
-- 1) check_access → SECURITY INVOKER (geen privilege-escalatie meer)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.check_access()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_access() TO anon;
GRANT EXECUTE ON FUNCTION public.check_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_access() TO service_role;

-- =============================================================================
-- 2) Storage: drop brede SELECT policies voor buckets media / invoices
--    (listing via Storage API). Laat policies staan die expliciet auth gebruiken.
-- =============================================================================
DO $$
DECLARE
  pol RECORD;
  q  text;
BEGIN
  FOR pol IN
    SELECT policyname, qual
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'SELECT'
  LOOP
    q := COALESCE(pol.qual::text, '');
    IF q ~* E'bucket_id\\s*=\\s*''media'''
       OR q ~* E'bucket_id\\s*=\\s*''invoices'''
    THEN
      IF q !~* 'auth\\.uid'
         AND q !~* 'auth\\.jwt'
         AND q !~* 'auth\\.role'
      THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
      END IF;
    END IF;
  END LOOP;
END $$;

-- Facturen-bucket: niet als “public bucket” markeren (PDF’s meestal via service role / signed).
UPDATE storage.buckets
SET public = false
WHERE id = 'invoices';

-- Verificatie na 20260807130000_reservations_anon_api_only.sql
-- Voer in Supabase SQL Editor uit (productie).

-- 1) Anon mag geen brede read/insert meer hebben
SELECT polname, polcmd, polroles::regrole[]
FROM pg_policy
WHERE polrelid = 'public.reservations'::regclass
ORDER BY polname;

-- Verwacht: GEEN policies met polcmd 'r'/'a' voor anon/authenticated
-- Wel: reservations_service_role_all (of vergelijkbaar) voor service_role

-- 2) Smoke: service role kan nog lezen (app gebruikt service_role in API)
-- (Alleen visueel — geen anon test hier)

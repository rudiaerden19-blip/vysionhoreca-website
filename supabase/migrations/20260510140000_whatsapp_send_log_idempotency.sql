-- ─────────────────────────────────────────────────────────────────────────────
-- WhatsApp idempotency-log — voorkomt dubbele berichten naar klanten.
--
-- Doel:
--   1) Bestelling-bevestiging (na checkout) wordt nooit meer dan 1× verzonden
--      voor hetzelfde order_id.
--   2) Status-updates (confirmed/preparing/ready/...) worden nooit meer dan
--      1× verzonden voor dezelfde combinatie (tenant, ordernummer, status).
--
-- Strategie:
--   - Eén tabel `whatsapp_send_log` met UNIQUE INDEX op
--     (tenant_slug, kind, dedupe_key).
--   - De server doet eerst INSERT ... RETURNING id; bij unique-violation
--     weten we dat een ander request al heeft verstuurd → skip Meta-call.
--   - Faalt de Meta-call alsnog (5xx, netwerk), dan delete de server de
--     net-toegevoegde row zodat een retry weer mag.
--
-- Geen impact op bestaande tabellen of policies.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.whatsapp_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL,
  kind text NOT NULL,            -- 'confirmation' | 'status:confirmed' | 'status:ready' | ...
  dedupe_key text NOT NULL,      -- order_id (confirmation) of '<orderNumber>:<status>' (status)
  phone text,                    -- klantnummer voor diagnose; mag null zijn
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_send_log_dedup
  ON public.whatsapp_send_log (tenant_slug, kind, dedupe_key);

CREATE INDEX IF NOT EXISTS whatsapp_send_log_sent_at_idx
  ON public.whatsapp_send_log (sent_at);

ALTER TABLE public.whatsapp_send_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_send_log'
      AND policyname = 'whatsapp_send_log_service_role_all'
  ) THEN
    CREATE POLICY whatsapp_send_log_service_role_all
      ON public.whatsapp_send_log
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END$$;

REVOKE ALL ON public.whatsapp_send_log FROM anon;
REVOKE ALL ON public.whatsapp_send_log FROM authenticated;

COMMENT ON TABLE public.whatsapp_send_log IS
  'Idempotency-log voor uitgaande WhatsApp-berichten. Server checkt UNIQUE (tenant_slug, kind, dedupe_key) vóór Meta-call.';

-- Verificatie
SELECT
  tablename,
  rowsecurity AS rls_on
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'whatsapp_send_log';

SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'whatsapp_send_log';

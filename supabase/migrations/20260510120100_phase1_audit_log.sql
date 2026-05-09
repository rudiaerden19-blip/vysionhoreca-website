-- =============================================================================
--  PHASE 1 · AUDIT LOG — wie wijzigde wat wanneer
-- =============================================================================
--  Wordt gevuld door /api/admin/db (server-side) bij elke mutation.
--  Geen DB-trigger: we willen actor-context (auth-headers) en die zit in API.
--
--  Bewaartermijn: 13 maanden (boekhoudkundige plicht). Oudere rows mogen
--  geanonimiseerd of verwijderd worden via een cron — voor nu: gewoon laten staan.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),

  tenant_slug     text        NOT NULL,
  actor_type      text        NOT NULL CHECK (actor_type IN ('owner','staff','superadmin','system','anon')),
  actor_id        text,                     -- business_profile.id of super_admin.id
  actor_email     text,

  action          text        NOT NULL,     -- bv. 'insert','update','delete','upsert','login','print'
  resource_type   text        NOT NULL,     -- bv. 'menu_products','orders'
  resource_id     text,                     -- pk van de geraakte rij (string, want sommige PKs zijn text)

  before_data     jsonb,                    -- vóór de mutation (optioneel)
  after_data      jsonb,                    -- erna (optioneel)

  ip              text,
  user_agent      text,
  request_id      uuid,                     -- voor correlatie met logger
  notes           text                      -- vrije ruimte (bv. "drawer kick", "manual entry")
);

CREATE INDEX IF NOT EXISTS audit_log_tenant_created_idx
  ON public.audit_log (tenant_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_actor_idx
  ON public.audit_log (actor_id);

CREATE INDEX IF NOT EXISTS audit_log_resource_idx
  ON public.audit_log (resource_type, resource_id);

-- RLS: alleen service_role (de migration v2_lockdown is hier afhankelijk van).
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

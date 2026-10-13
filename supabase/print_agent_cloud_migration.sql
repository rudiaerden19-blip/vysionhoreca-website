-- Cloud print queue (additief) — Windows Print Agent haalt jobs op via Vercel API.
-- Default uit: bestaande kassa's blijven lokaal printen.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_cloud_print_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenant_settings.kassa_cloud_print_enabled IS
  'Pilot: iPad/remote print via Supabase job queue naar Windows agent (HTTPS). Default false.';

CREATE TABLE IF NOT EXISTS print_agent_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_print_agent_devices_tenant
  ON print_agent_devices(tenant_slug)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS print_agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'printed', 'failed')),
  payload JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'api',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  printed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  processing_token UUID,
  UNIQUE (tenant_slug, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_print_agent_jobs_claim
  ON print_agent_jobs (tenant_slug, status, created_at ASC);

ALTER TABLE print_agent_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_agent_jobs ENABLE ROW LEVEL SECURITY;

-- Geen policies voor anon/authenticated: alleen service role via Next.js API.

CREATE OR REPLACE FUNCTION fail_stale_print_agent_jobs(p_max_age_minutes INT DEFAULT 15)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INT;
BEGIN
  UPDATE print_agent_jobs
  SET
    status = 'failed',
    failed_at = NOW(),
    error_message = COALESCE(error_message, 'processing timeout — geen automatische herdruk')
  WHERE status = 'processing'
    AND claimed_at IS NOT NULL
    AND claimed_at < NOW() - (p_max_age_minutes || ' minutes')::INTERVAL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION claim_next_print_agent_job(
  p_tenant_slug TEXT,
  p_processing_token UUID
)
RETURNS SETOF print_agent_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fail_stale_print_agent_jobs(15);
  RETURN QUERY
  UPDATE print_agent_jobs j
  SET
    status = 'processing',
    claimed_at = NOW(),
    processing_token = p_processing_token
  WHERE j.id = (
    SELECT id
    FROM print_agent_jobs
    WHERE tenant_slug = p_tenant_slug
      AND status = 'pending'
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING j.*;
END;
$$;

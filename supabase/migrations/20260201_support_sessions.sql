-- Support Sessions voor realtime co-browsing
-- NIEUW: Raakt geen bestaande tabellen aan

CREATE TABLE IF NOT EXISTS support_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  support_user_name TEXT NOT NULL DEFAULT 'Support',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index voor snelle lookup per tenant
CREATE INDEX IF NOT EXISTS idx_support_sessions_tenant ON support_sessions(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_support_sessions_status ON support_sessions(status);

-- RLS policies
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;

-- Iedereen kan actieve sessies zien (nodig voor tenant om te weten dat support kijkt)
CREATE POLICY "Anyone can view active sessions" ON support_sessions
  FOR SELECT
  USING (status = 'active');

-- Service role kan alles (voor API calls)
CREATE POLICY "Service role full access" ON support_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Automatisch oude sessies opruimen (ouder dan 24 uur)
-- Dit kan via een cron job of handmatig

COMMENT ON TABLE support_sessions IS 'Realtime support sessies voor co-browsing tussen support en tenant';

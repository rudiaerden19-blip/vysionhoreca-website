-- ============================================================
-- VERLOF MODULE - leave_requests tabel
-- Voer dit uit in de Supabase SQL Editor als de tabel ontbreekt
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug TEXT NOT NULL,
  staff_id UUID NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'vacation',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes voor performance (500+ tenants)
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant
  ON leave_requests(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_leave_requests_staff
  ON leave_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates
  ON leave_requests(tenant_slug, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status
  ON leave_requests(tenant_slug, status);

-- RLS inschakelen
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Service role krijgt volledige toegang (API routes gebruiken service role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'leave_requests'
    AND policyname = 'leave_requests_service_role'
  ) THEN
    CREATE POLICY "leave_requests_service_role" ON leave_requests
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Trigger voor updated_at
CREATE OR REPLACE FUNCTION update_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER trigger_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_requests_updated_at();

COMMENT ON TABLE leave_requests IS 'Verlofaanvragen van personeel per tenant. Geïsoleerd via tenant_slug.';

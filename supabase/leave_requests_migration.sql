-- Verlofaanvragen tabel
-- Voor het bijhouden van vakantie, ziekte, zwangerschapsverlof, etc.

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug VARCHAR(100) NOT NULL,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  
  -- Type verlof
  leave_type VARCHAR(50) NOT NULL, -- vacation, sick, maternity, paternity, unpaid, bereavement, other
  
  -- Datums
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Details
  reason TEXT,
  notes TEXT, -- Notities van werkgever
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  
  -- Tracking
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(255),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant ON leave_requests(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_leave_requests_staff ON leave_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(tenant_slug, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(tenant_slug, status);

-- RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_requests_all" ON leave_requests
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger voor updated_at
CREATE OR REPLACE FUNCTION update_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_requests_updated_at();

COMMENT ON TABLE leave_requests IS 'Verlofaanvragen van personeel per tenant';

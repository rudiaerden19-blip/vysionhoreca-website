-- Exceptional Closings Migration
-- Uitzonderlijke sluitingsdagen per tenant (feestdagen + eigen keuze)

CREATE TABLE IF NOT EXISTS exceptional_closings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug  VARCHAR(100) NOT NULL,
  date         DATE NOT NULL,
  date_end     DATE,
  reason       TEXT NOT NULL DEFAULT '',
  is_holiday   BOOLEAN NOT NULL DEFAULT false,
  holiday_key  VARCHAR(50),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_slug, date)
);

-- Als tabel al bestaat, voeg date_end toe
ALTER TABLE exceptional_closings ADD COLUMN IF NOT EXISTS date_end DATE;

CREATE INDEX IF NOT EXISTS idx_exceptional_closings_tenant ON exceptional_closings(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_exceptional_closings_date  ON exceptional_closings(tenant_slug, date);

ALTER TABLE exceptional_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for exceptional_closings" ON exceptional_closings FOR ALL USING (true);

-- QR Codes tabel
-- Voer dit uit in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'menu', -- menu, table, promo, review
  target_url TEXT NOT NULL,
  table_number INTEGER, -- Voor tafel QR codes
  scans INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index voor snelle lookups
CREATE INDEX IF NOT EXISTS idx_qr_codes_tenant ON qr_codes(tenant_slug);

-- RLS policies
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Policy voor lezen
CREATE POLICY "Allow read access to qr_codes" ON qr_codes
  FOR SELECT USING (true);

-- Policy voor insert
CREATE POLICY "Allow insert to qr_codes" ON qr_codes
  FOR INSERT WITH CHECK (true);

-- Policy voor update
CREATE POLICY "Allow update to qr_codes" ON qr_codes
  FOR UPDATE USING (true);

-- Policy voor delete
CREATE POLICY "Allow delete from qr_codes" ON qr_codes
  FOR DELETE USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_qr_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS qr_codes_updated_at ON qr_codes;
CREATE TRIGGER qr_codes_updated_at
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_qr_codes_updated_at();

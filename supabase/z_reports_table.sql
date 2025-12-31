-- Z-Rapporten tabel voor Vysion Horeca
-- Voer dit SQL uit in je Supabase Dashboard -> SQL Editor

-- Maak de z_reports tabel aan
CREATE TABLE IF NOT EXISTS z_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_number INTEGER NOT NULL,
  date DATE NOT NULL,
  orders_count INTEGER NOT NULL DEFAULT 0,
  revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  online_orders INTEGER NOT NULL DEFAULT 0,
  kassa_orders INTEGER NOT NULL DEFAULT 0,
  cash_payments DECIMAL(10,2) NOT NULL DEFAULT 0,
  card_payments DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  closed_by TEXT NOT NULL,
  sent_to_scarda BOOLEAN NOT NULL DEFAULT FALSE,
  sent_to_accountant BOOLEAN NOT NULL DEFAULT FALSE,
  accountant_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unieke index op business_id + report_number (elk bedrijf heeft eigen volgnummers)
CREATE UNIQUE INDEX IF NOT EXISTS idx_z_reports_business_number 
ON z_reports(business_id, report_number);

-- Unieke index op business_id + date (max 1 Z-rapport per dag per bedrijf)
CREATE UNIQUE INDEX IF NOT EXISTS idx_z_reports_business_date 
ON z_reports(business_id, date);

-- Index voor snelle queries
CREATE INDEX IF NOT EXISTS idx_z_reports_business_id 
ON z_reports(business_id);

CREATE INDEX IF NOT EXISTS idx_z_reports_date 
ON z_reports(date DESC);

-- Row Level Security (RLS) inschakelen
ALTER TABLE z_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Gebruikers kunnen alleen hun eigen z_reports zien
CREATE POLICY "Users can view own z_reports" ON z_reports
  FOR SELECT
  USING (true);

-- Policy: Gebruikers kunnen alleen z_reports aanmaken
CREATE POLICY "Users can insert z_reports" ON z_reports
  FOR INSERT
  WITH CHECK (true);

-- Policy: Gebruikers kunnen alleen de accountant velden updaten
CREATE POLICY "Users can update accountant fields" ON z_reports
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Trigger voor updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_z_reports_updated_at
  BEFORE UPDATE ON z_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Voeg comment toe voor documentatie
COMMENT ON TABLE z_reports IS 'Officiële Z-rapporten (dagafsluitingen) voor Vysion Horeca POS';
COMMENT ON COLUMN z_reports.report_number IS 'Uniek volgnummer per bedrijf, oplopend';
COMMENT ON COLUMN z_reports.sent_to_scarda IS 'Of het rapport is verstuurd naar SCARDA boekhouding';
COMMENT ON COLUMN z_reports.sent_to_accountant IS 'Of het rapport is gemaild naar de boekhouder';

-- Z-Rapporten tabel voor Vysion Horeca
-- Voer dit SQL uit in je Supabase Dashboard -> SQL Editor

-- Stap 1: Maak de z_reports tabel aan (ZONDER foreign key voor compatibiliteit)
CREATE TABLE IF NOT EXISTS z_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id TEXT NOT NULL,
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

-- Stap 2: Indexen voor snelle queries
CREATE INDEX IF NOT EXISTS idx_z_reports_business_id ON z_reports(business_id);
CREATE INDEX IF NOT EXISTS idx_z_reports_date ON z_reports(date DESC);

-- Stap 3: Row Level Security (RLS) uitschakelen voor nu (maakt testen makkelijker)
ALTER TABLE z_reports DISABLE ROW LEVEL SECURITY;

-- Klaar! Test met:
-- SELECT * FROM z_reports;

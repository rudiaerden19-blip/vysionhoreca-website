-- Openstaande café-rekeningen: één rij per dag per notitie. Raakt kassa/Z-rapport niet.
CREATE TABLE IF NOT EXISTS kassa_on_account (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  entry_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kassa_on_account_tenant_date
  ON kassa_on_account (tenant_slug, entry_date DESC);

ALTER TABLE kassa_on_account ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on kassa_on_account" ON kassa_on_account;
CREATE POLICY "Allow all on kassa_on_account" ON kassa_on_account FOR ALL USING (true);

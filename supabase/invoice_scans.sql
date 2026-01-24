-- Tabel voor gescande facturen per klant
CREATE TABLE IF NOT EXISTS invoice_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug TEXT NOT NULL,
  supplier TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  total_amount DECIMAL(10,2),
  image_url TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel voor items uit gescande facturen
CREATE TABLE IF NOT EXISTS invoice_scan_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_scan_id UUID REFERENCES invoice_scans(id) ON DELETE CASCADE,
  tenant_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'stuk',
  price_per_unit DECIMAL(10,4),
  total_price DECIMAL(10,2),
  vat_percentage INTEGER DEFAULT 6,
  added_to_ingredients BOOLEAN DEFAULT FALSE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexen voor snelle queries per klant
CREATE INDEX IF NOT EXISTS idx_invoice_scans_tenant ON invoice_scans(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_invoice_scans_created ON invoice_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_scan_items_tenant ON invoice_scan_items(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_invoice_scan_items_scan ON invoice_scan_items(invoice_scan_id);

-- Row Level Security (RLS) zodat klanten alleen hun eigen data zien
ALTER TABLE invoice_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_scan_items ENABLE ROW LEVEL SECURITY;

-- Policies voor invoice_scans
CREATE POLICY "Users can view own invoice scans" ON invoice_scans
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own invoice scans" ON invoice_scans
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own invoice scans" ON invoice_scans
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete own invoice scans" ON invoice_scans
  FOR DELETE USING (true);

-- Policies voor invoice_scan_items
CREATE POLICY "Users can view own invoice scan items" ON invoice_scan_items
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own invoice scan items" ON invoice_scan_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own invoice scan items" ON invoice_scan_items
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete own invoice scan items" ON invoice_scan_items
  FOR DELETE USING (true);

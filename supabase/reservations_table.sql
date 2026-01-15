-- =====================================================
-- VYSION HORECA - Reserveringen Tabel
-- Voer dit uit in je Supabase SQL Editor
-- =====================================================

-- RESERVATIONS - Tafel reserveringen
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  
  -- Klant gegevens
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255) DEFAULT '',
  
  -- Reservering details
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 2,
  notes TEXT DEFAULT '',
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index voor snelle queries
CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON reservations(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- Enable RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Public kan reserveringen maken (insert)
CREATE POLICY "Public insert reservations" ON reservations FOR INSERT WITH CHECK (true);

-- Public kan eigen reservering lezen (met telefoon check - later)
CREATE POLICY "Public read reservations" ON reservations FOR SELECT USING (true);

-- Authenticated users (admin) kunnen alles
CREATE POLICY "Auth full access reservations" ON reservations FOR ALL USING (true);

-- Trigger voor updated_at
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

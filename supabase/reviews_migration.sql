-- Reviews tabel
-- Voer dit uit in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  order_id UUID, -- optioneel, koppeling aan bestelling
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  reply TEXT, -- reactie van eigenaar
  replied_at TIMESTAMP WITH TIME ZONE,
  is_visible BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false, -- geverifieerd via bestelling
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index voor snelle lookups
CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON reviews(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(tenant_slug, rating);

-- RLS policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Allow insert to reviews" ON reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update to reviews" ON reviews
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete from reviews" ON reviews
  FOR DELETE USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- =====================================================
-- GUEST PROFILES MIGRATION
-- Voer uit in Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS guest_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  is_vip BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  notes TEXT DEFAULT '',
  total_visits INTEGER DEFAULT 0,
  total_no_shows INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_visit DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_profiles_tenant ON guest_profiles(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_phone ON guest_profiles(tenant_slug, phone);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_email ON guest_profiles(tenant_slug, email);

-- Voeg betaalvelden toe aan reservations tabel
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waitlist_position INTEGER;

-- Status uitgebreid met WAITLIST
-- Geen CHECK constraint dus werkt zonder verdere aanpassing

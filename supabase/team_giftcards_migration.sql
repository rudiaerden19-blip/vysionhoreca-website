-- Migration: Team Members & Gift Cards
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Add Stripe key to tenant_settings
-- ============================================
ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_public_key TEXT,
ADD COLUMN IF NOT EXISTS gift_cards_enabled BOOLEAN DEFAULT false;

-- ============================================
-- STEP 2: Create team_members table
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT, -- bijv. "Chef", "Eigenaar", "Medewerker"
  photo_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON team_members(tenant_slug);

-- ============================================
-- STEP 3: Create gift_cards table
-- ============================================
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- Unieke code voor inwisselen
  amount DECIMAL(10,2) NOT NULL, -- Waarde van de bon
  remaining_amount DECIMAL(10,2) NOT NULL, -- Resterend bedrag
  occasion TEXT, -- verjaardag, huwelijk, valentijn, zomaar, etc.
  personal_message TEXT,
  sender_name TEXT,
  sender_email TEXT,
  recipient_name TEXT,
  recipient_email TEXT NOT NULL,
  stripe_payment_id TEXT, -- Stripe payment intent ID
  status TEXT DEFAULT 'pending', -- pending, paid, used, expired
  is_sent BOOLEAN DEFAULT false, -- Email verzonden?
  expires_at TIMESTAMPTZ, -- Vervaldatum
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gift_cards_tenant ON gift_cards(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);

-- ============================================
-- STEP 4: Enable RLS
-- ============================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
CREATE POLICY "Team members are viewable by everyone" ON team_members
  FOR SELECT USING (true);

CREATE POLICY "Team members are editable by authenticated users" ON team_members
  FOR ALL USING (true);

-- RLS Policies for gift_cards
CREATE POLICY "Gift cards are viewable by everyone" ON gift_cards
  FOR SELECT USING (true);

CREATE POLICY "Gift cards are editable by authenticated users" ON gift_cards
  FOR ALL USING (true);

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE team_members IS 'Team members for each tenant to display on website';
COMMENT ON TABLE gift_cards IS 'Gift cards/cadeaubonnen purchased by customers';
COMMENT ON COLUMN tenant_settings.stripe_secret_key IS 'Stripe Secret API Key for payment processing';
COMMENT ON COLUMN tenant_settings.stripe_public_key IS 'Stripe Publishable Key for frontend';
COMMENT ON COLUMN tenant_settings.gift_cards_enabled IS 'Enable/disable gift card section on website';

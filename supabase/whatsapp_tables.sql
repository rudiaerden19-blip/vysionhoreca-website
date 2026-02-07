-- =====================================================
-- WHATSAPP ORDERING TABLES
-- Run this in Supabase SQL Editor
-- =====================================================

-- WhatsApp Settings per tenant
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug TEXT NOT NULL UNIQUE REFERENCES tenant_settings(tenant_slug) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,           -- WhatsApp Business Phone Number ID (Meta API)
  access_token TEXT NOT NULL,              -- Meta Access Token
  business_account_id TEXT,                -- Meta Business Account ID
  whatsapp_number TEXT,                    -- Actual WhatsApp phone number (for QR code)
  webhook_verify_token TEXT,               -- Custom verify token
  is_active BOOLEAN DEFAULT true,
  welcome_message TEXT DEFAULT 'Welkom! Typ "menu" om onze menukaart te bekijken.',
  order_confirmation_message TEXT DEFAULT 'Je bestelling is ontvangen! We laten je weten wanneer het klaar is.',
  ready_message TEXT DEFAULT 'Je bestelling is klaar! Je kunt het nu ophalen.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp Conversation Sessions
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug TEXT NOT NULL,
  phone TEXT NOT NULL,                     -- Customer's phone number
  state TEXT DEFAULT 'welcome',            -- Current conversation state
  cart JSONB DEFAULT '[]'::jsonb,          -- Shopping cart items
  data JSONB DEFAULT '{}'::jsonb,          -- Additional session data (name, notes, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_tenant 
ON whatsapp_sessions(phone, tenant_slug, updated_at DESC);

-- Index for WhatsApp settings lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_phone_id 
ON whatsapp_settings(phone_number_id);

-- Add source column to orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'source'
  ) THEN
    ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'web';
  END IF;
END $$;

-- Update orders source check constraint to include whatsapp
-- First drop existing constraint if any
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_source_check;

-- RLS Policies for whatsapp_settings
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Owners can manage their whatsapp settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "Service role full access to whatsapp_settings" ON whatsapp_settings;

-- Allow service role full access (for webhook)
CREATE POLICY "Service role full access to whatsapp_settings"
ON whatsapp_settings
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for whatsapp_sessions  
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role full access to whatsapp_sessions" ON whatsapp_sessions;

-- Allow service role full access (for webhook)
CREATE POLICY "Service role full access to whatsapp_sessions"
ON whatsapp_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to clean up old sessions (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_whatsapp_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM whatsapp_sessions 
  WHERE updated_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS whatsapp_settings_updated_at ON whatsapp_settings;
CREATE TRIGGER whatsapp_settings_updated_at
  BEFORE UPDATE ON whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();

DROP TRIGGER IF EXISTS whatsapp_sessions_updated_at ON whatsapp_sessions;
CREATE TRIGGER whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();

-- Grant permissions
GRANT ALL ON whatsapp_settings TO service_role;
GRANT ALL ON whatsapp_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE ON whatsapp_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_sessions TO authenticated;

-- =====================================================
-- DONE! 
-- Your WhatsApp ordering system is ready.
-- =====================================================

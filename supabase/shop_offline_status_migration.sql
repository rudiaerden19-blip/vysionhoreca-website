-- Create shop_offline_status table for manual online/offline toggle per tenant
CREATE TABLE IF NOT EXISTS shop_offline_status (
  tenant_slug TEXT PRIMARY KEY,
  is_offline BOOLEAN DEFAULT FALSE,
  offline_reason TEXT,
  offline_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add offline_message column if table already existed without it
ALTER TABLE shop_offline_status ADD COLUMN IF NOT EXISTS offline_message TEXT;

-- Disable RLS so the service role can always read/write
ALTER TABLE shop_offline_status ENABLE ROW LEVEL SECURITY;

-- Policy: service role (API) can do everything
CREATE POLICY IF NOT EXISTS "Service role full access" ON shop_offline_status
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- COST SETTINGS TABLE - Standaard prijzen en simulator data
-- Voer dit uit in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS cost_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) UNIQUE NOT NULL,
  
  -- Standaard prijzen
  saus DECIMAL(10,4) DEFAULT 0.12,
  sla DECIMAL(10,4) DEFAULT 0.13,
  tomaat DECIMAL(10,4) DEFAULT 0.14,
  ei DECIMAL(10,4) DEFAULT 0.12,
  potje_saus DECIMAL(10,4) DEFAULT 0.16,
  verpakking DECIMAL(10,4) DEFAULT 0.30,
  kosten_per_stuk DECIMAL(10,4) DEFAULT 0.40,
  
  -- Simulator data (JSON)
  simulator_items JSONB DEFAULT '[]'::jsonb,
  simulator_name TEXT DEFAULT '',
  simulator_multiplier DECIMAL(10,2) DEFAULT 3.0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cost_settings ENABLE ROW LEVEL SECURITY;

-- Policy - Allow all for now
CREATE POLICY "Allow all" ON cost_settings FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_cost_settings_tenant ON cost_settings(tenant_slug);

-- Group Orders / Groepsbestellingen System for Vysion Horeca
-- Created: 2026-02-09
-- Allows companies, schools, organizations to place bundled orders

-- ============================================
-- GROUPS - Bedrijven/Scholen/Organisaties
-- ============================================
CREATE TABLE IF NOT EXISTS order_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Link to restaurant
  tenant_slug VARCHAR(255) NOT NULL,
  
  -- Group info
  name TEXT NOT NULL, -- e.g. "Kantoor ABC", "Basisschool De Zon"
  group_type TEXT DEFAULT 'company' CHECK (group_type IN ('company', 'school', 'organization', 'event', 'other')),
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  
  -- Address (for delivery)
  address_street TEXT,
  address_city TEXT,
  address_postal TEXT,
  
  -- Settings
  max_members INTEGER DEFAULT 100,
  allow_individual_payment BOOLEAN DEFAULT true, -- Leden betalen zelf
  company_pays BOOLEAN DEFAULT false, -- Bedrijf betaalt alles
  
  -- Access code for members to join
  access_code TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  
  -- Notes
  notes TEXT
);

-- ============================================
-- GROUP MEMBERS - Leden van een groep
-- ============================================
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Link to group
  group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
  
  -- Member info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- For personalization
  department TEXT, -- Afdeling
  employee_id TEXT, -- Personeelsnummer
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'removed')),
  
  -- Unique per group
  UNIQUE(group_id, email)
);

-- ============================================
-- GROUP ORDER SESSIONS - Bestelmoment/deadline
-- ============================================
CREATE TABLE IF NOT EXISTS group_order_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Link to group
  group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
  tenant_slug VARCHAR(255) NOT NULL,
  
  -- Session info
  title TEXT, -- e.g. "Lunch Vrijdag 14 Feb"
  description TEXT,
  
  -- Timing
  order_deadline TIMESTAMP WITH TIME ZONE NOT NULL, -- Deadline om te bestellen
  delivery_time TIMESTAMP WITH TIME ZONE, -- Gewenste levertijd
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed', 'delivered', 'cancelled')),
  
  -- Totals (calculated)
  total_orders INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Notes from restaurant
  kitchen_notes TEXT
);

-- ============================================
-- EXTEND ORDERS TABLE - Link to group sessions
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS group_session_id UUID REFERENCES group_order_sessions(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS group_member_id UUID REFERENCES group_members(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_group_order BOOLEAN DEFAULT false;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_order_groups_tenant ON order_groups(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_order_groups_access_code ON order_groups(access_code);
CREATE INDEX IF NOT EXISTS idx_order_groups_status ON order_groups(status);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_email ON group_members(email);

CREATE INDEX IF NOT EXISTS idx_group_sessions_group ON group_order_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_sessions_tenant ON group_order_sessions(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_group_sessions_deadline ON group_order_sessions(order_deadline);
CREATE INDEX IF NOT EXISTS idx_group_sessions_status ON group_order_sessions(status);

CREATE INDEX IF NOT EXISTS idx_orders_group_session ON orders(group_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_group_member ON orders(group_member_id);
CREATE INDEX IF NOT EXISTS idx_orders_is_group ON orders(is_group_order);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE order_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_order_sessions ENABLE ROW LEVEL SECURITY;

-- Open policies (service role handles auth)
CREATE POLICY "Allow all on order_groups" ON order_groups FOR ALL USING (true);
CREATE POLICY "Allow all on group_members" ON group_members FOR ALL USING (true);
CREATE POLICY "Allow all on group_order_sessions" ON group_order_sessions FOR ALL USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate unique access code for groups
CREATE OR REPLACE FUNCTION generate_group_access_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6 character alphanumeric code (easy to share)
    new_code := upper(substr(md5(random()::text), 1, 6));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM order_groups WHERE access_code = new_code) INTO code_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Update session totals when orders change (fixed for DELETE)
CREATE OR REPLACE FUNCTION update_session_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.group_session_id IS NOT NULL THEN
      UPDATE group_order_sessions 
      SET 
        total_orders = (SELECT COUNT(*) FROM orders WHERE group_session_id = NEW.group_session_id),
        total_amount = (SELECT COALESCE(SUM(total), 0) FROM orders WHERE group_session_id = NEW.group_session_id)
      WHERE id = NEW.group_session_id;
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    IF OLD.group_session_id IS NOT NULL THEN
      UPDATE group_order_sessions 
      SET 
        total_orders = (SELECT COUNT(*) FROM orders WHERE group_session_id = OLD.group_session_id),
        total_amount = (SELECT COALESCE(SUM(total), 0) FROM orders WHERE group_session_id = OLD.group_session_id)
      WHERE id = OLD.group_session_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating session totals (no WHEN clause - logic is in function)
DROP TRIGGER IF EXISTS orders_session_totals ON orders;
CREATE TRIGGER orders_session_totals
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_session_totals();

-- Updated_at trigger for order_groups
CREATE OR REPLACE FUNCTION update_order_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_groups_updated_at ON order_groups;
CREATE TRIGGER order_groups_updated_at
  BEFORE UPDATE ON order_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_order_groups_updated_at();

-- ============================================
-- ADD GROUP ORDERS FEATURE FLAG TO TENANTS
-- ============================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS feature_group_orders BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS group_orders_price DECIMAL(10,2) DEFAULT 10.00; -- €10/maand extra

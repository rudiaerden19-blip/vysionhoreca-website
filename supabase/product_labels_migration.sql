-- Product Label Printing System for Vysion Horeca
-- Created: 2026-02-09
-- Allows per-product sticker/label printing

-- ============================================
-- ADD LABEL FIELDS TO PRODUCTS
-- ============================================
ALTER TABLE menu_products ADD COLUMN IF NOT EXISTS print_label BOOLEAN DEFAULT false;
ALTER TABLE menu_products ADD COLUMN IF NOT EXISTS label_template TEXT DEFAULT 'default';

-- ============================================
-- TENANT LABEL SETTINGS
-- ============================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS feature_label_printing BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS label_printer_type TEXT DEFAULT 'browser'; -- browser, brother, dymo, star
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS label_auto_print BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS label_width_mm INTEGER DEFAULT 62;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS label_height_mm INTEGER DEFAULT 29;

-- ============================================
-- LABEL QUEUE - Track what needs to be printed
-- ============================================
CREATE TABLE IF NOT EXISTS label_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Link to order
  tenant_slug VARCHAR(255) NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  
  -- Label content
  product_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  customer_name TEXT,
  options_text TEXT, -- formatted options like "Geen ui, Extra kaas"
  notes TEXT,
  
  -- For group orders
  group_member_name TEXT,
  department TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'printed', 'cancelled')),
  printed_at TIMESTAMP WITH TIME ZONE,
  printed_by TEXT
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_label_queue_tenant ON label_queue(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_label_queue_status ON label_queue(tenant_slug, status);
CREATE INDEX IF NOT EXISTS idx_label_queue_order ON label_queue(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_products_print_label ON menu_products(tenant_slug, print_label);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE label_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on label_queue" ON label_queue FOR ALL USING (true);

-- ============================================
-- FUNCTION: Auto-queue labels when order is created
-- ============================================
CREATE OR REPLACE FUNCTION queue_labels_for_order()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  product RECORD;
  order_rec RECORD;
  member_name TEXT;
  member_dept TEXT;
  i INTEGER;
BEGIN
  -- Get order info
  SELECT * INTO order_rec FROM orders WHERE id = NEW.order_id;
  
  -- Get group member info if applicable
  IF order_rec.group_member_id IS NOT NULL THEN
    SELECT name, department INTO member_name, member_dept 
    FROM group_members WHERE id = order_rec.group_member_id;
  END IF;
  
  -- Check if product has label printing enabled
  SELECT * INTO product FROM menu_products 
  WHERE id = NEW.product_id AND print_label = true;
  
  IF FOUND THEN
    -- Create label queue entries for each quantity
    FOR i IN 1..NEW.quantity LOOP
      INSERT INTO label_queue (
        tenant_slug,
        order_id,
        order_item_id,
        product_name,
        quantity,
        customer_name,
        options_text,
        notes,
        group_member_name,
        department
      ) VALUES (
        NEW.tenant_slug,
        NEW.order_id,
        NEW.id,
        NEW.product_name,
        1,
        order_rec.customer_name,
        NEW.options_json::TEXT,
        NEW.notes,
        member_name,
        member_dept
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-queue labels
DROP TRIGGER IF EXISTS order_items_queue_labels ON order_items;
CREATE TRIGGER order_items_queue_labels
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION queue_labels_for_order();

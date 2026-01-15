-- Orders/Bestellingen tabel
-- Voer dit uit in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  order_number SERIAL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  order_type VARCHAR(20) NOT NULL DEFAULT 'pickup', -- pickup, delivery
  status VARCHAR(20) NOT NULL DEFAULT 'new', -- new, confirmed, preparing, ready, delivered, completed, cancelled
  
  -- Delivery info
  delivery_address TEXT,
  delivery_notes TEXT,
  
  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_code VARCHAR(50),
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Payment
  payment_method VARCHAR(20), -- cash, card, online
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, refunded
  
  -- Timing
  requested_time TIMESTAMP WITH TIME ZONE, -- gewenste afhaal/lever tijd
  estimated_ready_time TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items (producten in bestelling)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_slug VARCHAR(255) NOT NULL,
  product_id UUID,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  options_json JSONB, -- geselecteerde opties als JSON
  options_price DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(tenant_slug, status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(tenant_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- RLS policies voor orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow insert to orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update to orders" ON orders FOR UPDATE USING (true);
CREATE POLICY "Allow delete from orders" ON orders FOR DELETE USING (true);

-- RLS policies voor order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to order_items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Allow insert to order_items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update to order_items" ON order_items FOR UPDATE USING (true);
CREATE POLICY "Allow delete from order_items" ON order_items FOR DELETE USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

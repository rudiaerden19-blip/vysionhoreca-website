-- Orders rejection feature
-- Voer dit uit in Supabase SQL Editor

-- Voeg rejection velden toe
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- Fix RLS policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on orders" ON orders;
CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on order_items" ON order_items;
CREATE POLICY "Allow all on order_items" ON order_items FOR ALL USING (true);

-- Rejection reasons referentie:
-- 'too_busy' = Te druk
-- 'technical' = Technisch probleem
-- 'closed' = We zijn gesloten
-- 'sold_out' = Product uitverkocht
-- 'delivery_unavailable' = Levering niet beschikbaar
-- 'other' = Andere reden

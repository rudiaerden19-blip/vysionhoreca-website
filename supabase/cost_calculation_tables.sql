-- Cost Calculation Tables for Vysion Horeca
-- Ingrediënten kostprijsberekening

-- 1. Cost Categories (multipliers per categorie)
CREATE TABLE IF NOT EXISTS cost_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  multiplier DECIMAL(4,2) NOT NULL DEFAULT 3.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ingredients (ingrediënten met inkoopprijs)
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'stuk', -- stuk, kg, liter, doos, etc.
  purchase_price DECIMAL(10,4) NOT NULL DEFAULT 0, -- inkoopprijs per eenheid
  units_per_package INTEGER DEFAULT 1, -- aantal stuks per doos/verpakking
  package_price DECIMAL(10,2) DEFAULT 0, -- prijs per doos/verpakking
  cost_category_id UUID REFERENCES cost_categories(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Product Ingredients (koppeling product <-> ingrediënten)
CREATE TABLE IF NOT EXISTS product_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL, -- Reference to products table
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10,4) NOT NULL DEFAULT 1, -- hoeveel van dit ingrediënt
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cost_categories_business ON cost_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_business ON ingredients(business_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(cost_category_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON product_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_ingredient ON product_ingredients(ingredient_id);

-- RLS Policies
ALTER TABLE cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (tenant checks in app)
CREATE POLICY "Allow all for cost_categories" ON cost_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for ingredients" ON ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for product_ingredients" ON product_ingredients FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_cost_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cost_categories_updated_at
  BEFORE UPDATE ON cost_categories
  FOR EACH ROW EXECUTE FUNCTION update_cost_updated_at();

CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_cost_updated_at();

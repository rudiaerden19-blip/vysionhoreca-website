-- Cost Calculation Tables for Vysion Horeca
-- Ingrediënten kostprijsberekening
-- UPDATED: Using tenant_slug instead of business_id

-- Drop old tables if they exist with wrong structure
DROP TABLE IF EXISTS product_ingredients CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS cost_categories CASCADE;

-- 1. Cost Categories (multipliers per categorie)
CREATE TABLE cost_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  multiplier DECIMAL(4,2) NOT NULL DEFAULT 3.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ingredients (ingrediënten met inkoopprijs)
CREATE TABLE ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'stuk',
  purchase_price DECIMAL(10,4) NOT NULL DEFAULT 0,
  units_per_package INTEGER DEFAULT 1,
  package_price DECIMAL(10,2) DEFAULT 0,
  cost_category_id UUID REFERENCES cost_categories(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Product Ingredients (koppeling product <-> ingrediënten)
CREATE TABLE product_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug TEXT NOT NULL,
  product_id UUID NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10,4) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_cost_categories_tenant ON cost_categories(tenant_slug);
CREATE INDEX idx_ingredients_tenant ON ingredients(tenant_slug);
CREATE INDEX idx_ingredients_category ON ingredients(cost_category_id);
CREATE INDEX idx_product_ingredients_tenant ON product_ingredients(tenant_slug);
CREATE INDEX idx_product_ingredients_product ON product_ingredients(product_id);
CREATE INDEX idx_product_ingredients_ingredient ON product_ingredients(ingredient_id);

-- RLS Policies
ALTER TABLE cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;

-- Allow all operations
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

DROP TRIGGER IF EXISTS update_cost_categories_updated_at ON cost_categories;
DROP TRIGGER IF EXISTS update_ingredients_updated_at ON ingredients;

CREATE TRIGGER update_cost_categories_updated_at
  BEFORE UPDATE ON cost_categories
  FOR EACH ROW EXECUTE FUNCTION update_cost_updated_at();

CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_cost_updated_at();

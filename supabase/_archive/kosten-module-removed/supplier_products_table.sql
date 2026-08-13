-- Supplier Products Database for Vysion Horeca
-- Leveranciers producten met kostprijsberekening
-- Updated: January 2026 - Vereenvoudigde structuur

-- Drop existing table if exists
DROP TABLE IF EXISTS supplier_products CASCADE;

-- Main supplier products table - VEREENVOUDIGD
CREATE TABLE supplier_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Product identificatie
  name TEXT NOT NULL,                              -- Productnaam (bijv. "HAMBURGER 30X100G VAN ZON")
  
  -- Prijzen & verpakking
  units_per_package INTEGER NOT NULL DEFAULT 1,    -- Aantal stuks per verpakking (bijv. 30)
  unit_price DECIMAL(10,4) NOT NULL,               -- Prijs per stuk (vooraf berekend)
  
  -- Categorisatie
  category TEXT,                                   -- VLEES, SNACKS, FRIET, DRANKEN, SAUZEN, etc.
  
  -- Beschikbaarheid
  is_available BOOLEAN DEFAULT true,
  
  -- Per tenant (elke snackbar eigen data)
  tenant_slug TEXT,                                -- NULL = algemene database, anders tenant-specifiek
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: naam + tenant
  UNIQUE(name, tenant_slug)
);

-- Indexes voor snelle zoekresultaten
CREATE INDEX idx_supplier_products_name ON supplier_products USING gin(to_tsvector('dutch', name));
CREATE INDEX idx_supplier_products_category ON supplier_products(category);
CREATE INDEX idx_supplier_products_tenant ON supplier_products(tenant_slug);
CREATE INDEX idx_supplier_products_available ON supplier_products(is_available);
CREATE INDEX idx_supplier_products_unit_price ON supplier_products(unit_price);

-- Full-text search function
CREATE OR REPLACE FUNCTION search_supplier_products(
  search_query TEXT,
  p_tenant_slug TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  units_per_package INTEGER,
  unit_price DECIMAL(10,4),
  category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.name,
    sp.units_per_package,
    sp.unit_price,
    sp.category
  FROM supplier_products sp
  WHERE sp.is_available = true
    AND (p_tenant_slug IS NULL OR sp.tenant_slug IS NULL OR sp.tenant_slug = p_tenant_slug)
    AND (p_category IS NULL OR sp.category = p_category)
    AND (
      sp.name ILIKE '%' || search_query || '%'
      OR to_tsvector('dutch', sp.name) @@ plainto_tsquery('dutch', search_query)
    )
  ORDER BY 
    CASE WHEN sp.name ILIKE search_query || '%' THEN 0 ELSE 1 END,
    sp.name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;

-- Allow all operations (we handle tenant filtering in queries)
CREATE POLICY "Allow all for supplier_products" ON supplier_products 
  FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_supplier_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supplier_products_updated_at
  BEFORE UPDATE ON supplier_products
  FOR EACH ROW EXECUTE FUNCTION update_supplier_products_updated_at();

-- Comment
COMMENT ON TABLE supplier_products IS 'Leveranciers producten database - omschrijving, aantal in doos, prijs per stuk';

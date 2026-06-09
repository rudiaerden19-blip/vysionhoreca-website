-- Fase 1 retail: voorraad per maat/kleur (variant-SKU met eigen barcode)

CREATE TABLE IF NOT EXISTS menu_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES menu_products(id) ON DELETE CASCADE,
  article_number TEXT,
  barcode TEXT,
  size_label TEXT,
  color_label TEXT,
  price_override NUMERIC(10, 2),
  track_stock BOOLEAN NOT NULL DEFAULT true,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_product_variants_tenant_product
  ON menu_product_variants (tenant_slug, product_id);

CREATE INDEX IF NOT EXISTS idx_menu_product_variants_tenant_barcode
  ON menu_product_variants (tenant_slug, barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

CREATE INDEX IF NOT EXISTS idx_menu_product_variants_tenant_article
  ON menu_product_variants (tenant_slug, article_number)
  WHERE article_number IS NOT NULL AND article_number <> '';

COMMENT ON TABLE menu_product_variants IS 'Retail SKU: eigen barcode/voorraad per maat-kleur';
COMMENT ON COLUMN menu_product_variants.price_override IS 'Leeg = prijs van parent menu_products';

ALTER TABLE menu_product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY menu_product_variants_public_read ON menu_product_variants
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY menu_product_variants_service_role_all ON menu_product_variants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

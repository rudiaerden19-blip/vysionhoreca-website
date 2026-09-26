-- Aankoop, extra barcodes, voorraadlog, klantkorting, factuurnummer, leveranciers en bestelbonnen.

ALTER TABLE menu_products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2);
ALTER TABLE menu_products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE menu_products ADD COLUMN IF NOT EXISTS supplier_id UUID;

ALTER TABLE retail_loyalty_members ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS retail_invoice_number TEXT;

CREATE TABLE IF NOT EXISTS retail_product_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID,
  barcode TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS retail_product_barcodes_tenant_code
  ON retail_product_barcodes (tenant_slug, barcode);

CREATE TABLE IF NOT EXISTS retail_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  product_id UUID,
  variant_id UUID,
  sku_name TEXT,
  reason TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL,
  quantity_after INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retail_stock_movements_tenant_created
  ON retail_stock_movements (tenant_slug, created_at DESC);

CREATE TABLE IF NOT EXISTS retail_invoice_counters (
  tenant_slug TEXT PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS retail_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS retail_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  supplier_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS retail_purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  purchase_order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID,
  quantity INTEGER NOT NULL,
  cost_price NUMERIC(12,2),
  received_quantity INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE retail_product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_purchase_order_lines ENABLE ROW LEVEL SECURITY;

-- Op rekening v2: tabs op naam via kassa (Marquise-pilot). Default uit voor alle tenants.
-- Voer uit in Supabase SQL Editor.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_name_account_v2 BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenant_settings.kassa_name_account_v2 IS
  'true = kassa snelmenu Op rekening opent popup (tabs op naam); op-rekening pagina v2; omzet pas bij betaling. false = legacy handmatig bedrag.';

CREATE TABLE IF NOT EXISTS kassa_name_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_key TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_slug, customer_key)
);

ALTER TABLE kassa_name_tabs
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'DINE_IN',
  ADD COLUMN IF NOT EXISTS table_number TEXT,
  ADD COLUMN IF NOT EXISTS floor_plan_zone TEXT;

COMMENT ON COLUMN kassa_name_tabs.order_type IS
  'BTW-context van tab (zelfde als kassa bij «op rekening»): DINE_IN | TAKEAWAY | DELIVERY.';

CREATE INDEX IF NOT EXISTS idx_kassa_name_tabs_tenant ON kassa_name_tabs (tenant_slug);

ALTER TABLE kassa_name_tabs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on kassa_name_tabs" ON kassa_name_tabs;
CREATE POLICY "Allow all on kassa_name_tabs" ON kassa_name_tabs FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE kassa_name_tabs IS
  'Open tabs op klantnaam (v2). items = kassa mand incl. unpaid_incl per regel; geen omzet tot betaling.';

-- Pilot: Café Marquise (pas slug aan indien nodig)
UPDATE tenant_settings
SET kassa_name_account_v2 = true
WHERE tenant_slug = 'cafemarquise';

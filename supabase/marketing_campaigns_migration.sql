-- Marketing Campaigns tabel
-- Voor het bijhouden van verzonden email campagnes

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  promo_code VARCHAR(50),
  promo_discount INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index voor snelle queries
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant ON marketing_campaigns(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_date ON marketing_campaigns(tenant_slug, sent_at DESC);

-- RLS
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_campaigns_all" ON marketing_campaigns
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE marketing_campaigns IS 'Marketing email campagnes per tenant';

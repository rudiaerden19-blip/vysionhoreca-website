-- Webshop browser-sessie (mand in DB + httpOnly cookie). Eénmalig in Supabase SQL Editor draaien
-- als PATCH /api/shop/browser-session { "error":"server" } geeft (tabel ontbreekt).

BEGIN;

CREATE TABLE IF NOT EXISTS public.webshop_browser_sessions (
  tenant_slug TEXT NOT NULL,
  session_token TEXT NOT NULL,
  cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  whatsapp_phone TEXT,
  shop_customer_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_slug, session_token)
);

CREATE INDEX IF NOT EXISTS idx_webshop_browser_sessions_updated
  ON public.webshop_browser_sessions (tenant_slug, updated_at DESC);

ALTER TABLE public.webshop_browser_sessions ENABLE ROW LEVEL SECURITY;

-- Geen anon/authenticated policies: alleen service role (API) schrijft/leest.

COMMIT;

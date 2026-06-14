-- Reserveringen vloer-lock, touch-toetsenbord prefs (kassa), webshop sessie (mand) — geen localStorage.

BEGIN;

ALTER TABLE public.reservation_settings
  ADD COLUMN IF NOT EXISTS floor_plan_tables_locked BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.reservation_settings.floor_plan_tables_locked IS
  'Plattegrond in reserveringen-UI vergrendeld (true = alleen kijken).';

ALTER TABLE public.kassa_pos_state
  ADD COLUMN IF NOT EXISTS touch_ui_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.kassa_pos_state.touch_ui_prefs IS
  'Touch UI per tenant: toetsenbord layout/positie (kassa/admin).';

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

COMMENT ON TABLE public.webshop_browser_sessions IS
  'Anonieme webshop-mand + WhatsApp-ref per browsercookie (geen localStorage).';

ALTER TABLE public.webshop_browser_sessions ENABLE ROW LEVEL SECURITY;

COMMIT;

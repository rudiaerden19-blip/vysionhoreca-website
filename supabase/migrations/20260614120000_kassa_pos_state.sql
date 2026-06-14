-- Kassa POS state per tenant (Supabase = enige bron; geen localStorage).
-- Actieve verkoopmedewerker, UI-donker, toog-bon watermarks.

BEGIN;

CREATE TABLE IF NOT EXISTS public.kassa_pos_state (
  tenant_slug TEXT PRIMARY KEY,
  active_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  active_staff_name TEXT,
  kassa_ui_dark BOOLEAN,
  bar_bon_watermarks JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.kassa_pos_state IS
  'Per-tenant kassa UI/state: actieve medewerker, donker thema, bar-bon watermarks.';

ALTER TABLE public.kassa_pos_state ENABLE ROW LEVEL SECURITY;

COMMIT;

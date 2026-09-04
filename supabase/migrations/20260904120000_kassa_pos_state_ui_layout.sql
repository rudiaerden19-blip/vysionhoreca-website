-- Per-tenant kassa-layout (luxe / light / slate / navy). kassa_ui_dark blijft in sync voor keuken/display.

BEGIN;

ALTER TABLE public.kassa_pos_state
  ADD COLUMN IF NOT EXISTS kassa_ui_layout TEXT;

UPDATE public.kassa_pos_state
SET kassa_ui_layout = CASE
  WHEN kassa_ui_dark IS FALSE THEN 'light'
  ELSE 'luxe'
END
WHERE kassa_ui_layout IS NULL;

COMMENT ON COLUMN public.kassa_pos_state.kassa_ui_layout IS
  'Kassa Mode: luxe | light | slate | navy. Eigenaar kiest per zaak.';

COMMIT;

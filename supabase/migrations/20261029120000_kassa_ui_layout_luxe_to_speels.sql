-- Luxe-mode verwijderd uit kassa UI; bestaande waarden → Dark (speels).
UPDATE public.kassa_pos_state
SET kassa_ui_layout = 'speels', updated_at = NOW()
WHERE kassa_ui_layout = 'luxe';

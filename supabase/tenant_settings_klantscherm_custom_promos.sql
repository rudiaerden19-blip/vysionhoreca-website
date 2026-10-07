-- Eigen promos op klantscherm (max 10): foto + titel, beschrijving, display-prijs, promotietekst.
-- Geen effect op kassa-prijzen.
--
-- Supabase SQL Editor: "Success. No rows returned" na ALTER TABLE is NORMAAL (geen SELECT).
-- Gebruik stap 2–4 hieronder om wél rijen te zien.

-- ── 1. Kolom aanmaken ─────────────────────────────────────────────────────
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS klantscherm_custom_promos JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tenant_settings.klantscherm_custom_promos IS
  'Array van { url, sort, title, description, displayPrice, promoText } — max 10, alleen klantscherm.';

-- ── 2. Controle: kolom bestaat? (verwacht 1 rij) ───────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenant_settings'
  AND column_name = 'klantscherm_custom_promos';

-- ── 3. Controle: jouw zaak (vervang tenant_slug) ───────────────────────────
-- SELECT
--   tenant_slug,
--   klantscherm_enabled,
--   jsonb_array_length(klantscherm_custom_promos) AS custom_promo_count,
--   klantscherm_custom_promos,
--   klantscherm_slideshow_uploads
-- FROM public.tenant_settings
-- WHERE tenant_slug = 'VUL-HIER-JOUW-SLUG-IN';

-- ── 4. Eenmalig: oude promo-foto-URLs → custom_promos (alleen als custom nog leeg) ──
-- Titels/prijzen vul je daarna opnieuw in admin → Klantscherm → Opslaan.
UPDATE public.tenant_settings ts
SET klantscherm_custom_promos = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'url', elem->>'url',
        'sort', COALESCE(NULLIF(trim(both from elem->>'sort'), '')::int, ord - 1),
        'title', '',
        'description', '',
        'displayPrice', '',
        'promoText', ''
      )
      ORDER BY ord
    )
    FROM jsonb_array_elements(ts.klantscherm_slideshow_uploads) WITH ORDINALITY AS t(elem, ord)
    WHERE coalesce(elem->>'url', '') <> ''
      AND coalesce(elem->>'mediaType', 'image') <> 'video'
      AND coalesce(elem->>'url', '') !~* '\.(mp4|webm|mov|m4v)(\?|$)'
  ),
  '[]'::jsonb
)
WHERE jsonb_array_length(COALESCE(ts.klantscherm_slideshow_uploads, '[]'::jsonb)) > 0
  AND jsonb_array_length(COALESCE(ts.klantscherm_custom_promos, '[]'::jsonb)) = 0;

-- ── 5. Na backfill: tenants met promos (verwacht ≥1 rij als er uploads waren) ──
SELECT tenant_slug, jsonb_array_length(klantscherm_custom_promos) AS promo_count
FROM public.tenant_settings
WHERE jsonb_array_length(klantscherm_custom_promos) > 0
ORDER BY tenant_slug;

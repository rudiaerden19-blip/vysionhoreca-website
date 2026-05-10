-- Twee plattegronden per tenant (binnen + terras) + open orders gescheiden per zone.
-- Bestaande rijen worden `inside`; voor elke tenant wordt een lege `terrace`-plattegrond toegevoegd.

BEGIN;

-- ── floor_plan_tables: PK (tenant_slug) → (tenant_slug, plan_zone) ─────────
ALTER TABLE public.floor_plan_tables
  ADD COLUMN IF NOT EXISTS plan_zone TEXT NOT NULL DEFAULT 'inside';

UPDATE public.floor_plan_tables SET plan_zone = 'inside' WHERE plan_zone IS NULL OR btrim(plan_zone) = '';

ALTER TABLE public.floor_plan_tables DROP CONSTRAINT IF EXISTS floor_plan_tables_pkey;

ALTER TABLE public.floor_plan_tables
  ADD CONSTRAINT floor_plan_tables_pkey PRIMARY KEY (tenant_slug, plan_zone);

ALTER TABLE public.floor_plan_tables
  DROP CONSTRAINT IF EXISTS floor_plan_tables_plan_zone_check;

ALTER TABLE public.floor_plan_tables
  ADD CONSTRAINT floor_plan_tables_plan_zone_check
  CHECK (plan_zone IN ('inside', 'terrace'));

COMMENT ON TABLE public.floor_plan_tables IS
  'Kassa plattegrond per zaal: inside | terrace — JSON-array tafels per (tenant_slug, plan_zone).';

INSERT INTO public.floor_plan_tables (tenant_slug, plan_zone, data, updated_at)
SELECT DISTINCT t.tenant_slug, 'terrace', '[]'::jsonb, NOW()
FROM public.floor_plan_tables t
WHERE NOT EXISTS (
  SELECT 1 FROM public.floor_plan_tables x
  WHERE x.tenant_slug = t.tenant_slug AND x.plan_zone = 'terrace'
);

-- ── floor_plan_decor (indien aanwezig):zelfde zones ─────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'floor_plan_decor'
  ) THEN
    ALTER TABLE public.floor_plan_decor
      ADD COLUMN IF NOT EXISTS plan_zone TEXT NOT NULL DEFAULT 'inside';

    UPDATE public.floor_plan_decor SET plan_zone = 'inside' WHERE plan_zone IS NULL OR btrim(plan_zone) = '';

    ALTER TABLE public.floor_plan_decor DROP CONSTRAINT IF EXISTS floor_plan_decor_pkey;

    ALTER TABLE public.floor_plan_decor
      ADD CONSTRAINT floor_plan_decor_pkey PRIMARY KEY (tenant_slug, plan_zone);

    ALTER TABLE public.floor_plan_decor
      DROP CONSTRAINT IF EXISTS floor_plan_decor_plan_zone_check;

    ALTER TABLE public.floor_plan_decor
      ADD CONSTRAINT floor_plan_decor_plan_zone_check
      CHECK (plan_zone IN ('inside', 'terrace'));

    INSERT INTO public.floor_plan_decor (tenant_slug, plan_zone, data)
    SELECT DISTINCT d.tenant_slug, 'terrace', '{}'::jsonb
    FROM public.floor_plan_decor d
    WHERE NOT EXISTS (
      SELECT 1 FROM public.floor_plan_decor x
      WHERE x.tenant_slug = d.tenant_slug AND x.plan_zone = 'terrace'
    );
  END IF;
END $$;

-- ── orders: zone voor open tafelmandsplitsing (rapportage blijft gewoon totalen per tenant) ──
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS floor_plan_zone TEXT NOT NULL DEFAULT 'inside';

UPDATE public.orders SET floor_plan_zone = 'inside'
WHERE floor_plan_zone IS NULL OR btrim(floor_plan_zone) = '';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_floor_plan_zone_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_floor_plan_zone_check
  CHECK (floor_plan_zone IN ('inside', 'terrace'));

COMMENT ON COLUMN public.orders.floor_plan_zone IS
  'Zaalebied voor dine-in tafel/kruk; voorkomt dat binnen tafel 1 = terras tafel 1 (open mand).';

-- POS / open mand: tafelreferentie op orders (sommige DB’s hadden deze kolom nog niet)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_number TEXT;

COMMENT ON COLUMN public.orders.table_number IS
  'Kassa/POS: tafel- of kruklabel voor DINE_IN; samen met floor_plan_zone per zaal.';

-- Dedupe oude dubbele open-rij per tenant+tafel (één rij behouden — nieuwste eerst).
DELETE FROM public.orders o
WHERE o.id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY tenant_slug,
                          COALESCE(floor_plan_zone, 'inside'),
                          table_number::text
             ORDER BY created_at DESC NULLS LAST, id DESC
           ) AS rn
    FROM public.orders
    WHERE status = 'open'
      AND table_number IS NOT NULL
      AND btrim(table_number::text) <> ''
  ) sub
  WHERE sub.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_one_open_table_per_zone
  ON public.orders (tenant_slug, floor_plan_zone, table_number)
  WHERE status = 'open'
    AND table_number IS NOT NULL
    AND btrim(table_number::text) <> '';

COMMIT;

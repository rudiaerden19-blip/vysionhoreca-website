-- Handmatig digitaal kasboek per tenant (inkomsten / uitgaven per regel).
-- Bewaar gegevens minstens 7 jaar (archief/backup); geen automatische purge in app.
--
-- Let op: sommige projecten hebben deze helper nog niet in public — dan faalt de trigger.
-- Daarom definiëren we de functie hier idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.tenant_kasboek_manual_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  line_date DATE NOT NULL,
  description TEXT NOT NULL,
  inkomsten NUMERIC(12, 2) NOT NULL DEFAULT 0,
  uitgaven NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_kasboek_manual_lines_nonneg CHECK (inkomsten >= 0 AND uitgaven >= 0),
  CONSTRAINT tenant_kasboek_manual_lines_one_positive CHECK (inkomsten > 0 OR uitgaven > 0)
);

CREATE INDEX IF NOT EXISTS idx_kasboek_manual_tenant_date
  ON public.tenant_kasboek_manual_lines (tenant_slug, line_date);

CREATE INDEX IF NOT EXISTS idx_kasboek_manual_tenant_created
  ON public.tenant_kasboek_manual_lines (tenant_slug, created_at);

COMMENT ON TABLE public.tenant_kasboek_manual_lines IS
  'Handmatig kasboek: bank, leveranciers, contant, enz. Per tenant; bewaarplicht ca. 7 jaar.';

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS kasboek_opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS kasboek_opening_balance_date DATE;

COMMENT ON COLUMN public.tenant_settings.kasboek_opening_balance IS
  'Beginsaldo kasboek vóór de eerste handmatige regel (optioneel).';

ALTER TABLE public.tenant_kasboek_manual_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_kasboek_manual_lines_all" ON public.tenant_kasboek_manual_lines;

CREATE POLICY "tenant_kasboek_manual_lines_all" ON public.tenant_kasboek_manual_lines
  FOR ALL
  USING (public.check_access())
  WITH CHECK (
    tenant_slug IS NOT NULL
    AND char_length(trim(tenant_slug)) > 0
  );

DROP TRIGGER IF EXISTS trg_kasboek_manual_updated ON public.tenant_kasboek_manual_lines;
CREATE TRIGGER trg_kasboek_manual_updated
  BEFORE UPDATE ON public.tenant_kasboek_manual_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Automatische kasboek-inkomsten uit orders (kassa + online afhalen/leveren/…).
-- Zelfde database-transactie als de order: geen aparte client-sync die kan haperen.
-- Logica gelijk aan admin-api orderCountsTowardRevenueAndZReport + isKassaPosOrder.

ALTER TABLE public.tenant_kasboek_manual_lines
  ADD COLUMN IF NOT EXISTS line_source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.tenant_kasboek_manual_lines
  ADD COLUMN IF NOT EXISTS order_id UUID;

UPDATE public.tenant_kasboek_manual_lines
SET line_source = 'manual'
WHERE line_source IS NULL;

ALTER TABLE public.tenant_kasboek_manual_lines
  DROP CONSTRAINT IF EXISTS tenant_kasboek_manual_lines_one_positive;

ALTER TABLE public.tenant_kasboek_manual_lines
  DROP CONSTRAINT IF EXISTS tenant_kasboek_manual_lines_kind;

ALTER TABLE public.tenant_kasboek_manual_lines
  ADD CONSTRAINT tenant_kasboek_manual_lines_kind CHECK (
    (line_source = 'manual' AND order_id IS NULL AND (inkomsten > 0 OR uitgaven > 0))
    OR (line_source = 'order' AND order_id IS NOT NULL AND uitgaven = 0 AND inkomsten > 0)
  );

ALTER TABLE public.tenant_kasboek_manual_lines
  DROP CONSTRAINT IF EXISTS tenant_kasboek_manual_lines_order_id_fkey;

ALTER TABLE public.tenant_kasboek_manual_lines
  ADD CONSTRAINT tenant_kasboek_manual_lines_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders (id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_kasboek_unique_tenant_order
  ON public.tenant_kasboek_manual_lines (tenant_slug, order_id);

COMMENT ON COLUMN public.tenant_kasboek_manual_lines.line_source IS
  'manual = zaak vult zelf in; order = automatisch uit orders (trigger).';

COMMENT ON COLUMN public.tenant_kasboek_manual_lines.order_id IS
  'Gekoppelde order voor automatische regel; NULL bij handmatig.';

COMMENT ON TABLE public.tenant_kasboek_manual_lines IS
  'Kasboek per tenant: handmatige regels + automatische omzet uit orders (trigger).';

-- RLS: clients mogen alleen handmatige regels muteren; order-regels alleen via trigger (SECURITY DEFINER).
DROP POLICY IF EXISTS "tenant_kasboek_manual_lines_all" ON public.tenant_kasboek_manual_lines;

CREATE POLICY tenant_kasboek_manual_lines_select ON public.tenant_kasboek_manual_lines
  FOR SELECT USING (public.check_access());

CREATE POLICY tenant_kasboek_manual_lines_insert ON public.tenant_kasboek_manual_lines
  FOR INSERT WITH CHECK (
    public.check_access()
    AND line_source = 'manual'
    AND order_id IS NULL
  );

CREATE POLICY tenant_kasboek_manual_lines_update ON public.tenant_kasboek_manual_lines
  FOR UPDATE
  USING (public.check_access() AND line_source = 'manual')
  WITH CHECK (public.check_access() AND line_source = 'manual' AND order_id IS NULL);

CREATE POLICY tenant_kasboek_manual_lines_delete ON public.tenant_kasboek_manual_lines
  FOR DELETE USING (public.check_access() AND line_source = 'manual');

CREATE OR REPLACE FUNCTION public.tenant_kasboek_sync_order_to_line()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  ot TEXT;
  st TEXT;
  ps TEXT;
  should BOOLEAN;
  ld DATE;
  desc_text TEXT;
BEGIN
  IF TG_OP <> 'INSERT' AND TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  st := lower(trim(coalesce(NEW.status, '')));
  ps := lower(trim(coalesce(NEW.payment_status, '')));
  ot := upper(trim(coalesce(NEW.order_type, '')));

  IF st IN ('cancelled', 'rejected') THEN
    DELETE FROM public.tenant_kasboek_manual_lines
    WHERE order_id = NEW.id AND line_source = 'order';
    RETURN NEW;
  END IF;

  -- POS (kassa): zelfde als isKassaPosOrder + betaald
  IF ot IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY') THEN
    should := (ps = 'paid');
  ELSE
    -- Webshop / online bestelling
    should := st IN ('confirmed', 'preparing', 'ready', 'completed', 'delivered')
      OR (ps = 'paid');
  END IF;

  IF NOT should THEN
    DELETE FROM public.tenant_kasboek_manual_lines
    WHERE order_id = NEW.id AND line_source = 'order';
    RETURN NEW;
  END IF;

  IF coalesce(NEW.total, 0) <= 0 THEN
    DELETE FROM public.tenant_kasboek_manual_lines
    WHERE order_id = NEW.id AND line_source = 'order';
    RETURN NEW;
  END IF;

  ld := (timezone('Europe/Brussels', coalesce(NEW.created_at, now())))::date;

  desc_text := 'Verkoop #' || coalesce(NEW.order_number::text, '?') || ' · ' ||
    CASE ot
      WHEN 'DINE_IN' THEN 'Zaal'
      WHEN 'TAKEAWAY' THEN 'Afhalen'
      WHEN 'DELIVERY' THEN 'Levering'
      ELSE 'Online bestelling'
    END;

  INSERT INTO public.tenant_kasboek_manual_lines (
    tenant_slug,
    line_date,
    description,
    inkomsten,
    uitgaven,
    line_source,
    order_id
  ) VALUES (
    NEW.tenant_slug,
    ld,
    desc_text,
    NEW.total,
    0,
    'order',
    NEW.id
  )
  ON CONFLICT (tenant_slug, order_id) DO UPDATE SET
    line_date = excluded.line_date,
    description = excluded.description,
    inkomsten = excluded.inkomsten,
    uitgaven = excluded.uitgaven,
    updated_at = now();

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_orders_tenant_kasboek_sync ON public.orders;
CREATE TRIGGER trg_orders_tenant_kasboek_sync
  AFTER INSERT OR UPDATE OF status, payment_status, total, order_type, created_at, tenant_slug, order_number
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tenant_kasboek_sync_order_to_line();

-- Optioneel: bestaande orders eenmalig laten doorlopen (kan lang duren op grote DB):
-- UPDATE public.orders SET payment_status = payment_status WHERE id IS NOT NULL;

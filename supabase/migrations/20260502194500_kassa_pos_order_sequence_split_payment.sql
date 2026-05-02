-- Atomische ordernummers per tenant voor kassa-POS (DINE_IN / TAKEAWAY / DELIVERY, betaald, niet-open).
-- Gesplitste betalingen + idempotente kassa-sync (offline retry).

CREATE TABLE IF NOT EXISTS public.tenant_order_sequences (
  tenant_slug text PRIMARY KEY,
  last_num integer NOT NULL CHECK (last_num >= 1000)
);

INSERT INTO public.tenant_order_sequences (tenant_slug, last_num)
SELECT tenant_slug, GREATEST(COALESCE(MAX(order_number), 1000), 1000)
FROM public.orders
GROUP BY tenant_slug
ON CONFLICT (tenant_slug) DO NOTHING;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_split_cash numeric(12, 2),
  ADD COLUMN IF NOT EXISTS payment_split_card numeric(12, 2),
  ADD COLUMN IF NOT EXISTS kassa_client_uuid uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tenant_kassa_client_uuid
  ON public.orders (tenant_slug, kassa_client_uuid)
  WHERE kassa_client_uuid IS NOT NULL;

CREATE OR REPLACE FUNCTION public.orders_assign_pos_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status::text = 'open' THEN
    RETURN NEW;
  END IF;
  IF NEW.payment_status IS DISTINCT FROM 'paid' THEN
    RETURN NEW;
  END IF;
  IF NEW.order_type::text NOT IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.tenant_order_sequences (tenant_slug, last_num)
  VALUES (
    NEW.tenant_slug,
    GREATEST(
      COALESCE(
        (SELECT MAX(o.order_number) FROM public.orders o WHERE o.tenant_slug = NEW.tenant_slug),
        1000
      ),
      1000
    )
  )
  ON CONFLICT (tenant_slug) DO NOTHING;

  UPDATE public.tenant_order_sequences t
  SET last_num = GREATEST(
      t.last_num,
      COALESCE(
        (SELECT MAX(o.order_number) FROM public.orders o WHERE o.tenant_slug = NEW.tenant_slug),
        1000
      )
    ) + 1
  WHERE t.tenant_slug = NEW.tenant_slug
  RETURNING t.last_num INTO NEW.order_number;

  IF NEW.order_number IS NULL THEN
    RAISE EXCEPTION 'orders_assign_pos_order_number: geen sequence voor tenant %', NEW.tenant_slug;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON TABLE public.tenant_order_sequences IS 'Laatst toegekend POS-order_number per tenant (trigger orders_assign_pos_order_number).';
COMMENT ON COLUMN public.orders.payment_split_cash IS 'Kassa gesplitste betaling: contant deel (EUR); samen met payment_split_card bij payment_method SPLIT.';
COMMENT ON COLUMN public.orders.payment_split_card IS 'Kassa gesplitste betaling: kaart deel (EUR); samen met payment_split_cash bij payment_method SPLIT.';
COMMENT ON COLUMN public.orders.kassa_client_uuid IS 'Idempotente sleutel per checkout (offline retry); uniek per tenant.';

DROP TRIGGER IF EXISTS trg_orders_assign_pos_order_number ON public.orders;
CREATE TRIGGER trg_orders_assign_pos_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_assign_pos_order_number();

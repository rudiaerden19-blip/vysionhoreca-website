-- Harde regel: geen order met scheduled_date op een uitzonderlijke sluitingsdag/periode.
-- Frontend blijft zoals nu (Supabase client); deze trigger kan niet worden omzeild.
-- Matcht logica met isDateInExceptionalClosing: periode date t/m date_end (of alleen date).

CREATE OR REPLACE FUNCTION public.enforce_order_scheduled_not_on_exceptional_closing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.scheduled_date IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM exceptional_closings ec
    WHERE ec.tenant_slug = NEW.tenant_slug
      AND NEW.scheduled_date >= ec.date
      AND NEW.scheduled_date <= CASE
        WHEN ec.date_end IS NOT NULL AND ec.date_end >= ec.date THEN ec.date_end
        ELSE ec.date
      END
  ) THEN
    RAISE EXCEPTION 'ORDER_SCHEDULED_ON_CLOSING_DAY: Deze datum valt in een sluitingsperiode.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_order_scheduled_not_on_exceptional_closing() IS
  'Blokkeert orders wanneer scheduled_date binnen exceptional_closings valt (tenant_slug).';

DROP TRIGGER IF EXISTS trg_orders_scheduled_not_on_exceptional_closing ON public.orders;

CREATE TRIGGER trg_orders_scheduled_not_on_exceptional_closing
  BEFORE INSERT OR UPDATE OF scheduled_date, tenant_slug ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_scheduled_not_on_exceptional_closing();

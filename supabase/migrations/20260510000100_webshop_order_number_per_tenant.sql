-- =============================================================================
--  Webshop ordernummer per tenant — atomair, race-safe, geen platform-leak
-- =============================================================================
--  Probleem vóór deze migratie:
--    · POS orders (DINE_IN/TAKEAWAY/DELIVERY) krijgen via
--      `orders_assign_pos_order_number` een per-tenant volgnummer ZODRA
--      `payment_status = 'paid'` (zie 20260502194500).
--    · Webshop orders (lowercase `pickup` / `delivery`) vielen daarbuiten en
--      gebruikten het globale `SERIAL` van `orders.order_number`. Resultaat:
--        - de eerste webshop-bestelling van een nieuwe tenant kreeg #4892
--          ipv #1001 (lekt platformvolume aan elke klant).
--        - twee gelijktijdige client-side checkouts konden hetzelfde nummer
--          claimen door de "MAX + 1"-truc in CheckoutPageClient.tsx (race).
--
--  Fix: nieuwe BEFORE INSERT-trigger die uitsluitend webshop-types
--  (`pickup`/`delivery`) afhandelt, parallel aan de bestaande POS-trigger.
--  Per-tenant atomair via `tenant_order_sequences` (zelfde tabel/lock).
--
--  Idempotent: als `NEW.order_number` al > 0 is bij INSERT (bv. handmatige
--  back-fill of admin-tool), wordt niets overschreven.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.orders_assign_webshop_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ot text;
BEGIN
  ot := lower(trim(coalesce(NEW.order_type::text, '')));

  -- Alleen webshop-orders. POS-types (uppercase) gaan door
  -- orders_assign_pos_order_number.
  IF ot NOT IN ('pickup', 'delivery') THEN
    RETURN NEW;
  END IF;

  -- Respecteer expliciete waarde (handmatige back-fill / migratie). Iemand die
  -- bewust een nummer meegeeft moet niet overschreven worden.
  IF NEW.order_number IS NOT NULL AND NEW.order_number > 0 THEN
    RETURN NEW;
  END IF;

  -- Atomair per-tenant volgnummer toekennen.
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
    RAISE EXCEPTION 'orders_assign_webshop_order_number: geen sequence voor tenant %', NEW.tenant_slug;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.orders_assign_webshop_order_number() TO service_role;

DROP TRIGGER IF EXISTS trg_orders_assign_webshop_order_number ON public.orders;
CREATE TRIGGER trg_orders_assign_webshop_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_assign_webshop_order_number();

COMMENT ON FUNCTION public.orders_assign_webshop_order_number() IS
  'Per-tenant ordernummer voor webshop-orders (pickup/delivery, lowercase). Parallel aan orders_assign_pos_order_number.';

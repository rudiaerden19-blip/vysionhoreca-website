-- ─────────────────────────────────────────────────────────────────────────────
-- Stripe checkout-sessie cache op orders.
--
-- Doel: voorkom dat we voor één bestelling meerdere Stripe Checkout sessies
-- aanmaken (klant tikt 2× op "betalen", browser-back, netwerk-retry).
--
-- Strategie:
--   - Bewaar de laatst-aangemaakte sessie samen met haar URL en timestamp.
--   - Bij een vervolgcall hergebruikt /api/stripe/create-checkout dezelfde
--     URL als de sessie nog jong genoeg is (< 23 uur — Stripe sessions
--     verlopen na 24 uur).
--
-- Geen impact op bestaande policies; service_role-policies van orders blijven
-- dezelfde toegang houden tot deze nieuwe kolommen.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_session_url text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_session_created_at timestamptz;

-- Index om snel te zoeken op session_id (gebruikt o.a. door de webhook
-- als fallback wanneer de metadata.order_id ontbreekt).
CREATE INDEX IF NOT EXISTS orders_stripe_session_id_idx
  ON public.orders (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

COMMENT ON COLUMN public.orders.stripe_session_id IS
  'Laatst aangemaakte Stripe Checkout session-id voor deze order; gebruikt om dubbele sessies te voorkomen.';
COMMENT ON COLUMN public.orders.stripe_session_url IS
  'Bijbehorende checkout-URL; hergebruikt zolang de sessie niet ouder is dan 23 uur.';
COMMENT ON COLUMN public.orders.stripe_session_created_at IS
  'Tijdstip aanmaken van stripe_session_id; gebruikt om verloop te bepalen.';

-- Verificatie
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name IN ('stripe_session_id', 'stripe_session_url', 'stripe_session_created_at')
ORDER BY column_name;

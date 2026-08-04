-- Guest profiles + no-show persistentie (contacten & rapporten)
-- Veilig idempotent — draai in Supabase SQL Editor of via migratie.

CREATE TABLE IF NOT EXISTS public.guest_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  is_vip BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  notes TEXT DEFAULT '',
  total_visits INTEGER DEFAULT 0,
  total_no_shows INTEGER NOT NULL DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  last_visit DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.guest_profiles
  ADD COLUMN IF NOT EXISTS total_no_shows INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS table_number VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- status: pending, confirmed, checked_in, completed, no_show, cancelled, waitlist (geen ENUM-lock)
ALTER TABLE public.reservations
  ALTER COLUMN status TYPE VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_guest_profiles_tenant ON public.guest_profiles (tenant_slug);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_phone ON public.guest_profiles (tenant_slug, phone);

CREATE UNIQUE INDEX IF NOT EXISTS guest_profiles_tenant_phone_uidx
  ON public.guest_profiles (tenant_slug, phone)
  WHERE phone IS NOT NULL AND btrim(phone) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS guest_profiles_tenant_email_uidx
  ON public.guest_profiles (tenant_slug, lower(btrim(email)))
  WHERE email IS NOT NULL AND btrim(email) <> '';

-- Sync guest_* vanuit legacy customer_* kolommen
UPDATE public.reservations
SET
  guest_name = COALESCE(NULLIF(btrim(guest_name), ''), customer_name),
  guest_phone = COALESCE(NULLIF(btrim(guest_phone), ''), customer_phone),
  guest_email = COALESCE(NULLIF(btrim(guest_email), ''), customer_email)
WHERE guest_name IS NULL
   OR guest_phone IS NULL
   OR guest_email IS NULL;

-- Tel bestaande no-shows per tenant + telefoon in guest_profiles (bestaande rijen)
UPDATE public.guest_profiles gp
SET total_no_shows = GREATEST(
  COALESCE(gp.total_no_shows, 0),
  COALESCE(sub.cnt, 0)
)
FROM (
  SELECT
    r.tenant_slug,
    NULLIF(btrim(COALESCE(r.guest_phone, r.customer_phone)), '') AS phone,
    COUNT(*)::int AS cnt
  FROM public.reservations r
  WHERE lower(btrim(r.status)) = 'no_show'
    AND NULLIF(btrim(COALESCE(r.guest_phone, r.customer_phone)), '') IS NOT NULL
  GROUP BY 1, 2
) sub
WHERE gp.tenant_slug = sub.tenant_slug
  AND gp.phone = sub.phone;

COMMENT ON COLUMN public.guest_profiles.total_no_shows IS 'Contact no-show + reservations.status=no_show';

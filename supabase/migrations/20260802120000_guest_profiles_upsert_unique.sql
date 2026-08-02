-- Unieke keys voor guest_profiles upsert (admin + publieke reserveringsflow).
-- Draait veilig meerdere keren (IF NOT EXISTS).

CREATE UNIQUE INDEX IF NOT EXISTS guest_profiles_tenant_phone_key
  ON public.guest_profiles (tenant_slug, phone)
  WHERE phone IS NOT NULL AND btrim(phone) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS guest_profiles_tenant_email_key
  ON public.guest_profiles (tenant_slug, email)
  WHERE email IS NOT NULL AND btrim(email) <> '';

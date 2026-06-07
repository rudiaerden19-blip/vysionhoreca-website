-- Eenmalig: zaak-login voor gkstest (RESET_REQUIRED → bcrypt-hash).
-- Supabase SQL Editor → Run (zelfde project als Vercel preview).

UPDATE public.business_profiles
SET password_hash = '$2b$12$XvaIAxWSHbNKptdtUVLeCuffGpeaZHFZzSbyPX30c1wIrlFXzJPve',
    updated_at = NOW()
WHERE tenant_slug = 'gkstest'
  AND lower(email) = lower('gkstest-pilot@vysionhoreca.com');

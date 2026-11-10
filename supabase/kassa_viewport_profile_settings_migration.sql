-- Platform-brede kassa viewport-profielen (superadmin studio). Geen tenant-specifieke rijen in v1.
CREATE TABLE IF NOT EXISTS public.kassa_viewport_profile_settings (
  profile_id TEXT NOT NULL,
  tenant_slug TEXT NOT NULL DEFAULT '_platform',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_email TEXT,
  PRIMARY KEY (profile_id, tenant_slug),
  CONSTRAINT kassa_viewport_profile_settings_profile_chk CHECK (
    profile_id IN ('wide15', 'sxga', 'default', 'ipad_129', 'ipad_10')
  ),
  CONSTRAINT kassa_viewport_profile_settings_platform_only CHECK (tenant_slug = '_platform')
);

ALTER TABLE public.kassa_viewport_profile_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY kassa_viewport_profile_settings_service_all
  ON public.kassa_viewport_profile_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kassa_viewport_profile_settings TO service_role;

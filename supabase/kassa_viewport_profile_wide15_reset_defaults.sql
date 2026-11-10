-- 15″ code-defaults opnieuw laten gelden (studio overschreef oude waarden).
DELETE FROM public.kassa_viewport_profile_settings
WHERE tenant_slug = '_platform' AND profile_id = 'wide15';

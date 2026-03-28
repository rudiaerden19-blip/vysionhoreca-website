-- Eenmalig: platform-/donor-tenants (MAIN) altijd Pro + actief in de database.
-- Slugs moeten overeenkomen met src/lib/protected-tenants.ts ADMIN_TENANTS.

UPDATE tenants
SET
  plan = 'pro',
  subscription_status = 'active',
  trial_ends_at = NULL,
  updated_at = NOW()
WHERE lower(slug) IN ('frituurnolim', 'skippsbv');

UPDATE subscriptions
SET
  plan = 'pro',
  status = 'active',
  trial_started_at = NULL,
  trial_ends_at = NULL,
  updated_at = NOW()
WHERE lower(tenant_slug) IN ('frituurnolim', 'skippsbv');

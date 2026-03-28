/**
 * When `post_trial_modules_confirmed` was never migrated on `tenants`, PostgREST returns
 * this error. Retry without that field, and run
 * `supabase/post_trial_modules_confirmed_migration.sql` in the Supabase SQL editor
 * when you want the full post-trial module picker semantics.
 */
export function isMissingPostTrialModulesColumnError(
  err: { message?: string } | null | undefined
): boolean {
  return !!(err?.message && err.message.includes('post_trial_modules_confirmed'))
}

export function withoutPostTrialModulesConfirmed<T extends Record<string, unknown>>(
  row: T
): Omit<T, 'post_trial_modules_confirmed'> {
  const next = { ...row }
  delete next.post_trial_modules_confirmed
  return next as Omit<T, 'post_trial_modules_confirmed'>
}

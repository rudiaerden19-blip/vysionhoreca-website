/**
 * Publieke demo-tenant reset (frituurnolim): veel sequentiële DELETEs, ~20s — geen productie-kassa.
 * Sentry performance "Blocking Operation" op deze routes is verwacht en niet actionable.
 */
const DEMO_RESET_TRANSACTION_PATTERNS: RegExp[] = [
  /\/api\/cron\/reset-demo-tenant/i,
  /\/api\/demo\/reset/i,
]

export function isDemoResetSentryTransaction(transactionName: string | undefined): boolean {
  if (!transactionName) return false
  return DEMO_RESET_TRANSACTION_PATTERNS.some((re) => re.test(transactionName))
}

/** Drop performance traces for demo reset (server + edge). */
export function sentryDropDemoResetTransaction<T extends { transaction?: string }>(
  event: T,
): T | null {
  if (isDemoResetSentryTransaction(event.transaction)) return null
  return event
}

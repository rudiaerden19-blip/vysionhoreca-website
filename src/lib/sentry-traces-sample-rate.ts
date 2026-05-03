/**
 * Traces sample rate for Sentry (0–1). Override with SENTRY_TRACES_SAMPLE_RATE.
 * Default: 1 in non-production, 0.1 in production (fewer spans / lower quota use).
 */
export function getSentryTracesSampleRate(): number {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE
  if (raw !== undefined && raw !== '') {
    const n = Number.parseFloat(raw.trim())
    if (!Number.isNaN(n) && n >= 0 && n <= 1) {
      return n
    }
  }
  return process.env.NODE_ENV === 'production' ? 0.1 : 1
}

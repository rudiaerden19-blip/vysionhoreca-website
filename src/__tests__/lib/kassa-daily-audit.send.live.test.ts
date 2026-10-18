/**
 * Live: stuur kassa-dagrapport (zet .env.local + KASSA_DAILY_AUDIT_EMAIL).
 * Gisteren: AUDIT_DATE=2026-10-17 npm test -- --testPathPatterns=kassa-daily-audit.send.live --runInBand
 */
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getBelgiumDateString, getDateBoundsForBelgium } from '@/lib/belgium-date-bounds'
import { runKassaDailyAuditJob } from '@/lib/kassa-daily-audit-email'
import { formatKassaDailyAuditReportPlain } from '@/lib/kassa-daily-audit-report'

const LIVE = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL

describe('kassa-daily-audit send live', () => {
  if (!LIVE) {
    it.skip('SUPABASE keys niet gezet', () => {})
    return
  }

  it('genereert en mailt rapport (AUDIT_DATE optioneel)', async () => {
    const fiscalDate = process.env.AUDIT_DATE?.trim() || getBelgiumDateString()
    const rangeEndUtc =
      fiscalDate < getBelgiumDateString()
        ? getDateBoundsForBelgium(fiscalDate).endUTC
        : undefined

    const client = createServerSupabaseClient()
    const result = await runKassaDailyAuditJob(client, { fiscalDate, rangeEndUtc })

    // eslint-disable-next-line no-console
    console.log('\n' + formatKassaDailyAuditReportPlain(result.reports))
    // eslint-disable-next-line no-console
    console.log('\nMail:', result.mail)

    expect(result.reports.length).toBeGreaterThan(0)
    if (process.env.KASSA_DAILY_AUDIT_EMAIL) {
      expect(result.mail.sent).toBe(true)
    }
  }, 120000)
})

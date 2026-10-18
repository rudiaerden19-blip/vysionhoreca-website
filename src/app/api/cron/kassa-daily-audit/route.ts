/**
 * Dagelijks kassa-auditrapport per e-mail (22:00 België ≈ 20:00 UTC in zomertijd).
 * Tenants: KASSA_DAILY_AUDIT_TENANT_SLUGS (default blonkys-restaurant, blonkyseethuis)
 * Ontvangers: KASSA_DAILY_AUDIT_EMAIL (komma-gescheiden)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/cron-auth'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { runKassaDailyAuditJob } from '@/lib/kassa-daily-audit-email'
import { getBelgiumDateString, getDateBoundsForBelgium } from '@/lib/belgium-date-bounds'

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()

  const cronDenied = requireCronSecret(request, {
    requestId,
    route: '/api/cron/kassa-daily-audit',
  })
  if (cronDenied) return cronDenied

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database niet geconfigureerd' }, { status: 503 })
  }

  try {
    const dateParam = request.nextUrl.searchParams.get('date')
    const fiscalDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : getBelgiumDateString()
    const rangeEndUtc =
      fiscalDate < getBelgiumDateString()
        ? getDateBoundsForBelgium(fiscalDate).endUTC
        : undefined

    const result = await runKassaDailyAuditJob(supabase, { fiscalDate, rangeEndUtc })
    logger.info('kassa-daily-audit cron done', {
      requestId,
      tenants: result.tenantSlugs,
      sent: result.mail.sent,
      sales: result.reports.map((r) => ({
        tenant: r.tenantSlug,
        count: r.salesCount,
        deleted: r.deleted.length,
      })),
    })

    return NextResponse.json({
      success: true,
      mail: result.mail,
      summary: result.reports.map((r) => ({
        tenantSlug: r.tenantSlug,
        fiscalDate: r.fiscalDate,
        salesCount: r.salesCount,
        salesTotalIncl: r.salesTotalIncl,
        deletedCount: r.deleted.length,
        changedCount: r.changed.length,
      })),
    })
  } catch (err) {
    logger.error('kassa-daily-audit cron failed', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Rapport mislukt' }, { status: 500 })
  }
}

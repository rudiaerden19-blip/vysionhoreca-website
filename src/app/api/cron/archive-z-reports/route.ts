import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/cron-auth'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { fetchOpeningHoursForTenant, lastCompletedBusinessDay } from '@/lib/tenant-business-day'
import { regenerateZReportForDate } from '@/lib/admin-api-order-operations'

// Vercel Cron — archiveert laatste afgesloten werkdag per tenant (openingsuren).

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    const cronDenied = requireCronSecret(request, {
      requestId,
      route: '/api/cron/archive-z-reports',
    })
    if (cronDenied) return cronDenied

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      logger.error('Database not configured', { requestId })
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { data: tenantRows, error: tenantError } = await supabase
      .from('tenant_settings')
      .select('tenant_slug')

    if (tenantError) {
      logger.error('Failed to list tenants', { requestId, error: tenantError.message })
      return NextResponse.json({ error: 'Failed to list tenants' }, { status: 500 })
    }

    const tenantSlugs = Array.from(
      new Set((tenantRows ?? []).map((r) => String(r.tenant_slug)).filter(Boolean)),
    )

    let archived = 0
    let failed = 0

    const archivedDates: string[] = []

    for (const tenantSlug of tenantSlugs) {
      try {
        const hours = await fetchOpeningHoursForTenant(supabase, tenantSlug)
        const fiscalDate = lastCompletedBusinessDay(new Date(), hours)
        await regenerateZReportForDate(supabase, tenantSlug, fiscalDate)
        archived += 1
        archivedDates.push(`${tenantSlug}:${fiscalDate}`)
      } catch (error) {
        failed += 1
        logger.error('Fiscal Z-report archive failed', {
          requestId,
          tenantSlug,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const duration = Date.now() - startTime
    logger.info('Fiscal Z-report cron completed', {
      requestId,
      tenantsProcessed: tenantSlugs.length,
      archived,
      failed,
      duration,
    })

    return NextResponse.json({
      success: true,
      tenantsProcessed: tenantSlugs.length,
      archived,
      failed,
      archivedDates,
      duration,
    })
  } catch (error) {
    logger.error('Cron job error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    })
    return NextResponse.json({
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

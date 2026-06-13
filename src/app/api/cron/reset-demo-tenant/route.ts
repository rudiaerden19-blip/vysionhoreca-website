import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/cron-auth'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { runHourlyDemoTenantReset } from '@/lib/hourly-demo-tenant-reset'

// Vercel Cron: elk uur op :00 UTC — DEMO_TENANT_SLUG (frituurnolim), zie demo-links.ts + hourly-demo-tenant-reset.ts
// vercel.json: schedule 0 * * * *

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const started = Date.now()

  try {
    const cronDenied = requireCronSecret(request, {
      requestId,
      route: '/api/cron/reset-demo-tenant',
    })
    if (cronDenied) return cronDenied

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      logger.error('reset-demo-tenant: database not configured', { requestId })
      return NextResponse.json({ error: 'Database not configured'}, { status: 503 })
    }

    logger.info('reset-demo-tenant: start', { requestId })
    const result = await runHourlyDemoTenantReset(supabase)

    const failedDeletes = result.deleted.filter((d) => d.error)
    const durationMs = Date.now() - started

    logger.info('reset-demo-tenant: done', {
      requestId,
      durationMs,
      tenant: result.tenant_slug,
      deleteErrors: failedDeletes.length,
      branding: result.branding,
      floor_tables: result.floor_plan_tables,
      floor_decor: result.floor_plan_decor,
      shop_online: result.shop_online,
    })

    return NextResponse.json({
      success: true,
      requestId,
      durationMs,
      ...result,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    logger.error('reset-demo-tenant cron error', { requestId, message })
    return NextResponse.json({ error: message, requestId }, { status: 500 })
  }
}

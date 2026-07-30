/**
 * POST /api/superadmin/reconcile-z-reports
 * Herbereken z_reports voor alle tenants (of filter) — bulk fix zonder handmatig werk.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifySuperAdminAccess } from '@/lib/verify-tenant-access'
import {
  defaultReconcileYearMonths,
  reconcileTenantZReports,
  reconcileTenantZReportsFast,
} from '@/lib/z-report-reconcile'
import { logger } from '@/lib/logger'

const BodySchema = z.object({
  yearMonths: z.array(z.string().regex(/^\d{4}-\d{2}$/)).optional(),
  tenants: z.array(z.string().min(1)).optional(),
  verify: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()
  const access = await verifySuperAdminAccess(req)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Geen toegang' }, { status: 403 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const parsed = BodySchema.safeParse(body)
  const yearMonths = parsed.success && parsed.data.yearMonths?.length
    ? parsed.data.yearMonths
    : defaultReconcileYearMonths()
  const tenantFilter = parsed.success ? parsed.data.tenants : undefined
  const verify = parsed.success && parsed.data.verify === true

  const { data: tenantRows } = await supabase.from('tenant_settings').select('tenant_slug')
  let slugs = (tenantRows ?? []).map((r) => String(r.tenant_slug)).filter(Boolean).sort()
  if (tenantFilter?.length) {
    slugs = slugs.filter((s) => tenantFilter.includes(s))
  }

  const results: Awaited<ReturnType<typeof reconcileTenantZReports>>[] = []
  let totalDates = 0

  try {
    for (const slug of slugs) {
      const result = verify
        ? await reconcileTenantZReports(supabase, slug, yearMonths, 'all_order_days')
        : await reconcileTenantZReportsFast(supabase, slug, yearMonths)
      results.push(result)
      totalDates += result.datesRegenerated.length
    }

    logger.info('superadmin reconcile-z-reports done', {
      requestId,
      tenants: slugs.length,
      totalDates,
    })

    return NextResponse.json({
      ok: true,
      yearMonths,
      tenantsProcessed: slugs.length,
      totalDatesRegenerated: totalDates,
      results,
    })
  } catch (err) {
    logger.error('superadmin reconcile-z-reports failed', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Bulk reconcile mislukt' }, { status: 500 })
  }
}

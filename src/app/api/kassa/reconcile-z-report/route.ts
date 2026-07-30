/**
 * POST /api/kassa/reconcile-z-report
 * Herbereken alle fiscale dagen met bonnen voor één tenant (mei/juni + recente maanden).
 * Auth: tenant of superadmin — geen handmatig werk voor de zaak.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import {
  defaultReconcileYearMonths,
  reconcileTenantZReports,
} from '@/lib/z-report-reconcile'
import { logger } from '@/lib/logger'

const BodySchema = z.object({
  tenantSlug: z.string().min(1),
  yearMonths: z.array(z.string().regex(/^\d{4}-\d{2}$/)).optional(),
})

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
    }

    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
    }

    const { tenantSlug, yearMonths } = parsed.data
    const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
    }

    const months = yearMonths?.length ? yearMonths : defaultReconcileYearMonths()
    const result = await reconcileTenantZReports(
      supabase,
      tenantSlug,
      months,
      'all_order_days',
    )

    logger.info('[kassa/reconcile-z-report] done', {
      requestId,
      tenantSlug,
      dates: result.datesRegenerated.length,
      issuesBefore: result.issuesBefore,
      issuesAfter: result.issuesAfter,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    logger.error('[kassa/reconcile-z-report] error', {
      requestId,
      err: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}

/**
 * POST /api/admin/z-report/move-sales-day
 * Verplaats alle bonnen van één fiscale dag naar een andere + herbereken z_reports.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { moveFiscalDaySales } from '@/lib/admin-api-order-operations'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { logger } from '@/lib/logger'

const BodySchema = z.object({
  tenantSlug: z.string().min(1),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

    const { tenantSlug, fromDate, toDate } = parsed.data

    const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
    }

    const { data: closedRow } = await supabase
      .from('z_reports')
      .select('is_closed')
      .eq('tenant_slug', tenantSlug)
      .eq('report_date', fromDate)
      .maybeSingle()

    if (closedRow?.is_closed) {
      return NextResponse.json(
        { error: 'De bron-dag is afgesloten en kan niet worden verplaatst.' },
        { status: 409 },
      )
    }

    const result = await moveFiscalDaySales(supabase, tenantSlug, fromDate, toDate)
    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[admin/z-report/move-sales-day] uncaught', { requestId, err: message })
    return NextResponse.json({ error: message || 'Interne fout' }, { status: 500 })
  }
}

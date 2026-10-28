/**
 * Billit dag-sync na Z-sluiting — pilot alleen thelagoon.
 * POST { tenantSlug, reportDate } — auth: tenant admin of superadmin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { isBillitLagoonPilotTenant } from '@/lib/billit-lagoon-pilot'
import { syncBillitLagoonZDay } from '@/lib/billit-sync-z-day'

const BodySchema = z.object({
  tenantSlug: z.string().min(1),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(req: NextRequest) {
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

    const { tenantSlug, reportDate } = parsed.data

    if (!isBillitLagoonPilotTenant(tenantSlug)) {
      return NextResponse.json({ error: 'Billit sync niet actief voor deze zaak' }, { status: 403 })
    }

    const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
    }

    const result = await syncBillitLagoonZDay(supabase, tenantSlug, reportDate)

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
    }

    if ('skipped' in result && result.skipped) {
      return NextResponse.json({ ok: true, skipped: true, reason: result.reason, billitOrderId: null })
    }

    return NextResponse.json({
      ok: true,
      billitOrderId: result.billitOrderId ?? null,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Interne fout' },
      { status: 500 },
    )
  }
}

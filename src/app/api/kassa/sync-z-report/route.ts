/**
 * Kassa Z-report sync — server-side, service-role.
 *
 * POST  /api/kassa/sync-z-report
 * Body  { tenantSlug: string, date: string (YYYY-MM-DD) }
 *
 * Wordt aangeroepen door de browser na elke kassa-betaling om het Z-rapport
 * van de fiscale dag opnieuw te berekenen. Gebruikt service-role omdat de
 * z_reports tabel sinds Phase 1 RLS-lockdown niet meer rechtstreeks vanuit
 * anon writebaar is.
 *
 * Aanvragen vereisen geldige tenant- of superadmin-headers (zelfde mechanisme
 * als /api/admin/db). Anders 403.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { regenerateZReportForDate } from '@/lib/admin-api-order-operations'
import { logger } from '@/lib/logger'
import { apiRateLimiter, checkRateLimit } from '@/lib/rate-limit'

const BodySchema = z.object({
  tenantSlug: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date moet YYYY-MM-DD zijn'),
})

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ongeldige JSON'}, { status: 400 })
    }
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ongeldige aanvraag'}, { status: 400 })
    }
    const { tenantSlug, date } = parsed.data

    const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Niet geautoriseerd'}, { status: 403 })
    }

    // Rate-limit per tenant — voorkomt dat 1 kassa de DB platslaat
    const actorId = req.headers.get('x-business-id') || req.headers.get('x-superadmin-id') || 'anon'
    const rl = await checkRateLimit(apiRateLimiter, `z-sync:${tenantSlug}:${actorId}`)
    if (!rl.success) {
      return NextResponse.json({ error: 'Te veel verzoeken'}, { status: 429 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database niet beschikbaar'}, { status: 503 })
    }

    await regenerateZReportForDate(supabase, tenantSlug, date)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    logger.error('[kassa/sync-z-report] uncaught', { requestId, err: err?.message || String(err) })
    return NextResponse.json({ error: 'Interne fout'}, { status: 500 })
  }
}

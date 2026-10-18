/**
 * Handmatig kassa-dagrapport (zelfde inhoud als 22:00-cron).
 * GET ?date=YYYY-MM-DD  &send=1 om ook te mailen
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAccess } from '@/lib/verify-tenant-access'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import {
  formatKassaDailyAuditReportPlain,
  resolveKassaDailyAuditTenantSlugs,
} from '@/lib/kassa-daily-audit-report'
import { generateKassaDailyAuditReports, sendKassaDailyAuditEmail } from '@/lib/kassa-daily-audit-email'
import { getBelgiumDateString } from '@/lib/belgium-date-bounds'

export async function GET(req: NextRequest) {
  const access = await verifySuperAdminAccess(req)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Geen toegang' }, { status: 403 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database niet geconfigureerd' }, { status: 503 })
  }

  const dateParam = req.nextUrl.searchParams.get('date')
  const fiscalDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : getBelgiumDateString()
  const tenantsParam = req.nextUrl.searchParams.get('tenants')
  const tenantSlugs = tenantsParam
    ? tenantsParam.split(',').map((t) => t.trim()).filter(Boolean)
    : resolveKassaDailyAuditTenantSlugs()
  const send = req.nextUrl.searchParams.get('send') === '1'
  const format = req.nextUrl.searchParams.get('format')

  const reports = await generateKassaDailyAuditReports(supabase, tenantSlugs, { fiscalDate })

  if (send) {
    const mail = await sendKassaDailyAuditEmail(reports)
    return NextResponse.json({ reports, mail })
  }

  if (format === 'text') {
    return new NextResponse(formatKassaDailyAuditReportPlain(reports), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  return NextResponse.json({ fiscalDate, reports })
}

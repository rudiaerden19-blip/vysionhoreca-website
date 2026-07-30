/**
 * GET /api/superadmin/audit-z-reports
 * Query: months=2026-05,2026-06  tenant=blonkys-restaurant (optioneel)
 *
 * Volledige audit: bonnen vs dag-Z vs maand-Z vs z_reports archief.
 * Auth: superadmin headers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifySuperAdminAccess } from '@/lib/verify-tenant-access'
import { auditAllTenantsZReports } from '@/lib/z-report-audit'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID()

  const access = await verifySuperAdminAccess(req)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Geen toegang' }, { status: 403 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database niet geconfigureerd' }, { status: 503 })
  }

  const monthsParam = req.nextUrl.searchParams.get('months') || '2026-05,2026-06'
  const yearMonths = monthsParam
    .split(',')
    .map((m) => m.trim())
    .filter((m) => /^\d{4}-\d{2}$/.test(m))

  if (yearMonths.length === 0) {
    return NextResponse.json({ error: 'months moet YYYY-MM,YYYY-MM zijn' }, { status: 400 })
  }

  const tenantParam = req.nextUrl.searchParams.get('tenant')
  const tenantFilter = tenantParam
    ? tenantParam.split(',').map((t) => t.trim()).filter(Boolean)
    : undefined

  try {
    const report = await auditAllTenantsZReports(supabase, yearMonths, tenantFilter)

  const blonkys = report.tenants.filter((t) => t.tenantSlug.includes('blonkys'))

    logger.info('Z-report audit completed', {
      requestId,
      totalIssues: report.totalIssues,
      tenantsWithIssues: report.tenantsWithIssues,
    })

    return NextResponse.json({
      ...report,
      blonkysSummary: blonkys.map((t) => ({
        tenantSlug: t.tenantSlug,
        issueCount: t.issueCount,
        totalDeltaEur: t.totalDeltaEur,
        byKind: t.byKind,
        topIssues: t.issues.slice(0, 50),
      })),
    })
  } catch (err) {
    logger.error('audit-z-reports failed', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Audit mislukt' }, { status: 500 })
  }
}

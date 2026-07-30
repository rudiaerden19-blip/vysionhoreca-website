/**
 * Herbereken z_reports uit orders zodat archief = bonnen = dag = maand.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fiscalReportDateForOrderCreatedAt,
  getBelgiumDateString,
} from '@/lib/belgium-date-bounds'
import { orderCountsTowardRevenueAndZReport, type Order } from '@/lib/admin-api-order-helpers'
import {
  fetchAllOrdersInCreatedAtRange,
  regenerateZReportForDate,
} from '@/lib/admin-api-order-operations'
import {
  getLastDayOfMonthYmd,
  monthBoundsUtc,
} from '@/lib/z-report-month'
import {
  auditTenantZReports,
  type ZReportAuditIssue,
  type ZReportAuditIssueKind,
} from '@/lib/z-report-audit'

const REGENERATE_KINDS: ZReportAuditIssueKind[] = [
  'archive_missing',
  'archive_total_mismatch',
  'archive_count_mismatch',
  'archive_btw_mismatch',
  'archive_order_ids_missing',
  'archive_order_ids_extra',
  'archive_stale_nonempty',
]

export function defaultReconcileYearMonths(): string[] {
  const today = getBelgiumDateString()
  const [y, m] = today.split('-').map(Number)
  const months: string[] = []
  for (let i = 0; i < 4; i++) {
    const dt = new Date(y, m - 1 - i, 1)
    months.push(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`,
    )
  }
  for (const fixed of ['2026-05', '2026-06']) {
    if (!months.includes(fixed)) months.push(fixed)
  }
  return months.sort()
}

export function fiscalDatesFromAuditIssues(issues: ZReportAuditIssue[]): string[] {
  const dates = new Set<string>()
  for (const issue of issues) {
    if (!issue.fiscalDate) continue
    if (REGENERATE_KINDS.includes(issue.kind)) dates.add(issue.fiscalDate)
  }
  return [...dates].sort()
}

/** Alle fiscale dagen met meetellende bonnen in de opgegeven maanden. */
export async function collectFiscalDatesWithOrders(
  client: SupabaseClient,
  tenantSlug: string,
  yearMonths: string[],
): Promise<string[]> {
  const dates = new Set<string>()
  const today = getBelgiumDateString()

  for (const ym of yearMonths) {
    const monthEnd = getLastDayOfMonthYmd(ym)
    const capYmd = today < monthEnd ? today : monthEnd
    const { startUTC, endUTC } = monthBoundsUtc(ym, capYmd)

    const ordersRaw = await fetchAllOrdersInCreatedAtRange(
      client,
      tenantSlug,
      startUTC,
      endUTC,
      'id, total, order_type, status, payment_status, created_at',
    )

    for (const raw of ordersRaw) {
      const o = raw as unknown as Order
      if (!orderCountsTowardRevenueAndZReport(o)) continue
      const created = String(o.created_at || '')
      const fiscal = fiscalReportDateForOrderCreatedAt(created)
      if (fiscal && fiscal.startsWith(ym)) dates.add(fiscal)
    }
  }

  return [...dates].sort()
}

export type TenantReconcileResult = {
  tenantSlug: string
  datesRegenerated: string[]
  issuesBefore: number
  issuesAfter: number
}

export async function reconcileTenantZReportsFast(
  client: SupabaseClient,
  tenantSlug: string,
  yearMonths: string[],
): Promise<TenantReconcileResult> {
  const dates = await collectFiscalDatesWithOrders(client, tenantSlug, yearMonths)
  for (const date of dates) {
    await regenerateZReportForDate(client, tenantSlug, date)
  }
  return {
    tenantSlug,
    datesRegenerated: dates,
    issuesBefore: 0,
    issuesAfter: 0,
  }
}

export async function reconcileTenantZReports(
  client: SupabaseClient,
  tenantSlug: string,
  yearMonths: string[],
  mode: 'audit' | 'all_order_days' = 'audit',
): Promise<TenantReconcileResult> {
  const before = await auditTenantZReports(client, tenantSlug, yearMonths)

  let dates: string[]
  if (mode === 'all_order_days') {
    dates = await collectFiscalDatesWithOrders(client, tenantSlug, yearMonths)
  } else {
    dates = fiscalDatesFromAuditIssues(before.issues)
    if (dates.length === 0) {
      dates = await collectFiscalDatesWithOrders(client, tenantSlug, yearMonths)
    }
  }

  for (const date of dates) {
    await regenerateZReportForDate(client, tenantSlug, date)
  }

  const after =
    dates.length > 0
      ? await auditTenantZReports(client, tenantSlug, yearMonths)
      : before

  return {
    tenantSlug,
    datesRegenerated: dates,
    issuesBefore: before.issueCount,
    issuesAfter: after.issueCount,
  }
}

export type BatchReconcileResult = {
  yearMonths: string[]
  batchIndex: number
  batchCount: number
  tenantsProcessed: number
  tenantsWithRegeneration: number
  totalDatesRegenerated: number
  remainingIssues: number
  tenants: TenantReconcileResult[]
}

export async function reconcileTenantBatch(
  client: SupabaseClient,
  yearMonths: string[],
  batchIndex: number,
  batchCount: number,
): Promise<BatchReconcileResult> {
  const { data: tenantRows } = await client.from('tenant_settings').select('tenant_slug')
  const slugs = (tenantRows ?? [])
    .map((r) => String(r.tenant_slug))
    .filter(Boolean)
    .sort()

  const slice = slugs.filter((_, i) => i % batchCount === batchIndex)
  const tenants: TenantReconcileResult[] = []
  let totalDates = 0

  for (const slug of slice) {
    const result = await reconcileTenantZReportsFast(client, slug, yearMonths)
    tenants.push(result)
    totalDates += result.datesRegenerated.length
  }

  let remainingIssues = 0
  // skip — fast batch; volledige audit via /api/superadmin/audit-z-reports

  return {
    yearMonths,
    batchIndex,
    batchCount,
    tenantsProcessed: slice.length,
    tenantsWithRegeneration: tenants.filter((t) => t.datesRegenerated.length > 0).length,
    totalDatesRegenerated: totalDates,
    remainingIssues,
    tenants,
  }
}

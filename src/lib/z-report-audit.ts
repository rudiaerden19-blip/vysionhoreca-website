/**
 * Volledige Z-rapport audit: bonnen (orders) vs dag vs maand vs archief (z_reports).
 * Gebruik via /api/superadmin/audit-z-reports of npm run audit:z-reports.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fiscalReportDateForOrderCreatedAt,
  getBelgiumDateString,
  getZRapportDateBounds,
} from '@/lib/belgium-date-bounds'
import {
  isKassaPosOrder,
  orderCountsTowardRevenueAndZReport,
  type Order,
} from '@/lib/admin-api-order-helpers'
import { fetchAllOrdersInCreatedAtRange } from '@/lib/admin-api-order-operations'
import { buildZReportDayAmountsFromOrders } from '@/lib/z-report-day-builder'
import {
  buildZReportMonthDayRows,
  getLastDayOfMonthYmd,
  monthBoundsUtc,
  sumZReportMonthAmounts,
} from '@/lib/z-report-month'
import { fetchZReportVatContextFromSupabase } from '@/lib/z-report-vat-context'

export type ZReportAuditIssueKind =
  | 'archive_missing'
  | 'archive_total_mismatch'
  | 'archive_count_mismatch'
  | 'archive_btw_mismatch'
  | 'archive_order_ids_extra'
  | 'archive_order_ids_missing'
  | 'archive_stale_nonempty'
  | 'month_day_row_mismatch'
  | 'month_sum_mismatch'
  | 'fiscal_boundary_leak'
  | 'kassa_bon_not_in_z'

export type ZReportAuditIssue = {
  kind: ZReportAuditIssueKind
  tenantSlug: string
  fiscalDate?: string
  yearMonth?: string
  orderId?: string
  ordersTotal: number
  archiveTotal: number | null
  orderCount: number
  archiveCount: number | null
  deltaEur: number
  detail: string
}

export type TenantZReportAuditResult = {
  tenantSlug: string
  yearMonths: string[]
  bonnenKassaPaid: number
  zCountedOrders: number
  issueCount: number
  totalDeltaEur: number
  byKind: Record<string, number>
  issues: ZReportAuditIssue[]
}

export type ZReportAuditReport = {
  generatedAt: string
  yearMonths: string[]
  tenantCount: number
  tenantsWithIssues: number
  totalIssues: number
  totalDeltaEur: number
  byKind: Record<string, number>
  tenants: TenantZReportAuditResult[]
}

type ZReportRow = {
  report_date: string
  order_count: number | null
  total: number | null
  tax_low: number | null
  tax_mid: number | null
  tax_high: number | null
  order_ids: string[] | null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function isPaidKassaBon(order: Pick<Order, 'order_type' | 'payment_status' | 'status'>): boolean {
  if (!isKassaPosOrder(order)) return false
  const st = (order.status || '').toString().toLowerCase()
  if (['cancelled', 'rejected'].includes(st)) return false
  return (order.payment_status || '').toString().toLowerCase() === 'paid'
}

function foldArchiveTax(row: ZReportRow): number {
  return round2(
    (Number(row.tax_low) || 0) + (Number(row.tax_mid) || 0) + (Number(row.tax_high) || 0),
  )
}

function foldComputedTax(amounts: ReturnType<typeof buildZReportDayAmountsFromOrders>): number {
  return round2(amounts.tax_low + amounts.tax_mid + amounts.tax_high)
}

function pushIssue(
  issues: ZReportAuditIssue[],
  issue: ZReportAuditIssue,
  byKind: Record<string, number>,
): void {
  issues.push(issue)
  byKind[issue.kind] = (byKind[issue.kind] || 0) + 1
}

export async function auditTenantZReports(
  client: SupabaseClient,
  tenantSlug: string,
  yearMonths: string[],
): Promise<TenantZReportAuditResult> {
  const issues: ZReportAuditIssue[] = []
  const byKind: Record<string, number> = {}

  const { data: settings } = await client
    .from('tenant_settings')
    .select('btw_percentage')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  const btw = Number(settings?.btw_percentage) || 6
  const vatContext = await fetchZReportVatContextFromSupabase(client, tenantSlug)

  let bonnenKassaPaid = 0
  let zCountedOrders = 0

  for (const ym of yearMonths) {
    const today = getBelgiumDateString()
    const monthEnd = getLastDayOfMonthYmd(ym)
    const capYmd = today < monthEnd ? today : monthEnd
    const { startUTC, endUTC } = monthBoundsUtc(ym, capYmd)

    const ordersRaw = await fetchAllOrdersInCreatedAtRange(
      client,
      tenantSlug,
      startUTC,
      endUTC,
      'id, total, payment_method, payment_split_cash, payment_split_card, order_type, status, payment_status, items, created_at',
    )
    const orders = ordersRaw as unknown as Order[]

    for (const o of orders) {
      if (isPaidKassaBon(o)) bonnenKassaPaid += 1
      if (orderCountsTowardRevenueAndZReport(o)) zCountedOrders += 1
      if (isPaidKassaBon(o) && !orderCountsTowardRevenueAndZReport(o)) {
        pushIssue(
          issues,
          {
            kind: 'kassa_bon_not_in_z',
            tenantSlug,
            orderId: String(o.id || ''),
            ordersTotal: Number(o.total) || 0,
            archiveTotal: null,
            orderCount: 1,
            archiveCount: null,
            deltaEur: Number(o.total) || 0,
            detail: `Kassa-bon betaald maar niet in Z-filter (status=${o.status})`,
          },
          byKind,
        )
      }
    }

    const byFiscal = new Map<string, Order[]>()
    for (const o of orders) {
      const created = String(o.created_at || '')
      if (!created) continue
      const fiscal = fiscalReportDateForOrderCreatedAt(created)
      if (!fiscal || !fiscal.startsWith(ym)) continue
      if (!orderCountsTowardRevenueAndZReport(o)) continue
      const list = byFiscal.get(fiscal) || []
      list.push(o)
      byFiscal.set(fiscal, list)
    }

    const { data: zReportsRaw } = await client
      .from('z_reports')
      .select(
        'report_date, order_count, total, tax_low, tax_mid, tax_high, order_ids',
      )
      .eq('tenant_slug', tenantSlug)
      .like('report_date', `${ym}%`)

    const zByDate = new Map<string, ZReportRow>()
    for (const row of zReportsRaw ?? []) {
      zByDate.set(String(row.report_date), row as ZReportRow)
    }

    const monthRows = buildZReportMonthDayRows(orders, ym, capYmd, btw, vatContext)
    const monthSum = monthRows.length ? sumZReportMonthAmounts(monthRows) : null

    let computedMonthTotal = 0
    let computedMonthCount = 0
    for (const [, dayOrders] of byFiscal) {
      const a = buildZReportDayAmountsFromOrders(dayOrders, btw, vatContext)
      computedMonthTotal = round2(computedMonthTotal + a.orderTotalIncl)
      computedMonthCount += a.orderCount
    }

    if (monthSum && round2(monthSum.totalIncl) !== computedMonthTotal) {
      pushIssue(
        issues,
        {
          kind: 'month_sum_mismatch',
          tenantSlug,
          yearMonth: ym,
          ordersTotal: computedMonthTotal,
          archiveTotal: monthSum.totalIncl,
          orderCount: computedMonthCount,
          archiveCount: monthSum.orderCount,
          deltaEur: moneyDelta(computedMonthTotal, monthSum.totalIncl),
          detail: `Maandtotaal uit dagrijen (${monthSum.totalIncl}) ≠ som fiscale bonnen (${computedMonthTotal})`,
        },
        byKind,
      )
    }

    for (const [fiscalDate, dayOrders] of byFiscal) {
      const amounts = buildZReportDayAmountsFromOrders(dayOrders, btw, vatContext)
      const z = zByDate.get(fiscalDate)
      const monthRow = monthRows.find((r) => r.date === fiscalDate)

      if (monthRow && monthRow.totalIncl !== amounts.orderTotalIncl) {
        pushIssue(
          issues,
          {
            kind: 'month_day_row_mismatch',
            tenantSlug,
            fiscalDate,
            yearMonth: ym,
            ordersTotal: amounts.orderTotalIncl,
            archiveTotal: monthRow.totalIncl,
            orderCount: amounts.orderCount,
            archiveCount: monthRow.orderCount,
            deltaEur: moneyDelta(amounts.orderTotalIncl, monthRow.totalIncl),
            detail: 'Maandrij ≠ herberekende dag uit bonnen',
          },
          byKind,
        )
      }

      const bounds = getZRapportDateBounds(fiscalDate)
      for (const o of dayOrders) {
        const created = String(o.created_at || '')
        const t = new Date(created)
        const fiscal = fiscalReportDateForOrderCreatedAt(created)
        if (
          t >= new Date(bounds.startUTC) &&
          t <= new Date(bounds.endUTC) &&
          fiscal !== fiscalDate
        ) {
          pushIssue(
            issues,
            {
              kind: 'fiscal_boundary_leak',
              tenantSlug,
              fiscalDate,
              orderId: String(o.id || ''),
              ordersTotal: Number(o.total) || 0,
              archiveTotal: null,
              orderCount: 1,
              archiveCount: null,
              deltaEur: Number(o.total) || 0,
              detail: `Bon in bounds van ${fiscalDate} maar fiscale dag=${fiscal}`,
            },
            byKind,
          )
        }
      }

      if (!z) {
        pushIssue(
          issues,
          {
            kind: 'archive_missing',
            tenantSlug,
            fiscalDate,
            yearMonth: ym,
            ordersTotal: amounts.orderTotalIncl,
            archiveTotal: null,
            orderCount: amounts.orderCount,
            archiveCount: null,
            deltaEur: amounts.orderTotalIncl,
            detail: 'Bonnen in DB maar geen z_reports archiefrij (sidebar/e-mail oud)',
          },
          byKind,
        )
        continue
      }

      const zTotal = round2(Number(z.total) || 0)
      const zCount = Number(z.order_count) || 0

      if (zTotal !== amounts.orderTotalIncl) {
        pushIssue(
          issues,
          {
            kind: 'archive_total_mismatch',
            tenantSlug,
            fiscalDate,
            yearMonth: ym,
            ordersTotal: amounts.orderTotalIncl,
            archiveTotal: zTotal,
            orderCount: amounts.orderCount,
            archiveCount: zCount,
            deltaEur: moneyDelta(amounts.orderTotalIncl, zTotal),
            detail: 'z_reports.total ≠ som order.total (live bonnen)',
          },
          byKind,
        )
      }

      if (zCount !== amounts.orderCount) {
        pushIssue(
          issues,
          {
            kind: 'archive_count_mismatch',
            tenantSlug,
            fiscalDate,
            yearMonth: ym,
            ordersTotal: amounts.orderTotalIncl,
            archiveTotal: zTotal,
            orderCount: amounts.orderCount,
            archiveCount: zCount,
            deltaEur: moneyDelta(amounts.orderCount, zCount),
            detail: `z_reports.order_count=${zCount} vs bonnen=${amounts.orderCount}`,
          },
          byKind,
        )
      }

      const zTax = foldArchiveTax(z)
      const computedTax = foldComputedTax(amounts)
      if (zTax !== computedTax) {
        pushIssue(
          issues,
          {
            kind: 'archive_btw_mismatch',
            tenantSlug,
            fiscalDate,
            yearMonth: ym,
            ordersTotal: computedTax,
            archiveTotal: zTax,
            orderCount: amounts.orderCount,
            archiveCount: zCount,
            deltaEur: moneyDelta(computedTax, zTax),
            detail: 'z_reports BTW ≠ herberekend uit bonregels',
          },
          byKind,
        )
      }

      const zIds = new Set((z.order_ids || []).map(String))
      const computedIds = new Set(amounts.orderIds.map(String))
      for (const id of computedIds) {
        if (!zIds.has(id)) {
          pushIssue(
            issues,
            {
              kind: 'archive_order_ids_missing',
              tenantSlug,
              fiscalDate,
              orderId: id,
              ordersTotal: amounts.orderTotalIncl,
              archiveTotal: zTotal,
              orderCount: amounts.orderCount,
              archiveCount: zCount,
              deltaEur: 0,
              detail: 'Bon in orders maar niet in z_reports.order_ids',
            },
            byKind,
          )
        }
      }
      for (const id of zIds) {
        if (!computedIds.has(id)) {
          pushIssue(
            issues,
            {
              kind: 'archive_order_ids_extra',
              tenantSlug,
              fiscalDate,
              orderId: id,
              ordersTotal: amounts.orderTotalIncl,
              archiveTotal: zTotal,
              orderCount: amounts.orderCount,
              archiveCount: zCount,
              deltaEur: 0,
              detail: 'ID in z_reports.order_ids maar bon niet meer in fiscale dag',
            },
            byKind,
          )
        }
      }
    }

    for (const z of zReportsRaw ?? []) {
      const date = String(z.report_date)
      if (!byFiscal.has(date) && round2(Number(z.total) || 0) > 0) {
        pushIssue(
          issues,
          {
            kind: 'archive_stale_nonempty',
            tenantSlug,
            fiscalDate: date,
            yearMonth: ym,
            ordersTotal: 0,
            archiveTotal: round2(Number(z.total) || 0),
            orderCount: 0,
            archiveCount: Number(z.order_count) || 0,
            deltaEur: round2(Number(z.total) || 0),
            detail: 'Archief heeft omzet maar geen meetellende bonnen op die fiscale dag',
          },
          byKind,
        )
      }
    }
  }

  const totalDeltaEur = round2(
    issues.reduce((s, i) => s + Math.abs(i.deltaEur), 0),
  )

  return {
    tenantSlug,
    yearMonths,
    bonnenKassaPaid,
    zCountedOrders,
    issueCount: issues.length,
    totalDeltaEur,
    byKind,
    issues,
  }
}

function moneyDelta(expected: number, actual: number): number {
  return round2(expected - actual)
}

export async function auditAllTenantsZReports(
  client: SupabaseClient,
  yearMonths: string[],
  tenantFilter?: string[],
): Promise<ZReportAuditReport> {
  const { data: tenantRows } = await client.from('tenant_settings').select('tenant_slug')
  let slugs = (tenantRows ?? []).map((r) => String(r.tenant_slug)).filter(Boolean)
  if (tenantFilter?.length) {
    slugs = slugs.filter((s) => tenantFilter.includes(s))
  }
  slugs.sort()

  const tenants: TenantZReportAuditResult[] = []
  const byKind: Record<string, number> = {}
  let totalIssues = 0
  let totalDeltaEur = 0

  for (const slug of slugs) {
    const result = await auditTenantZReports(client, slug, yearMonths)
    tenants.push(result)
    totalIssues += result.issueCount
    totalDeltaEur = round2(totalDeltaEur + result.totalDeltaEur)
    for (const [k, v] of Object.entries(result.byKind)) {
      byKind[k] = (byKind[k] || 0) + v
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    yearMonths,
    tenantCount: slugs.length,
    tenantsWithIssues: tenants.filter((t) => t.issueCount > 0).length,
    totalIssues,
    totalDeltaEur,
    byKind,
    tenants,
  }
}

/**
 * Z-rapport maandoverzicht — één mail met dagrijen + maandtotalen.
 */

import {
  orderCountsTowardRevenueAndZReport,
  type Order,
} from '@/lib/admin-api'
import {
  addDaysToBelgiumYMD,
  fiscalReportDateForOrderCreatedAt,
  getBelgiumDateString,
} from '@/lib/belgium-date-bounds'
import { businessDayForOrder, getTenantBusinessDayBounds, type TenantHourRow } from '@/lib/tenant-business-day'

export { fiscalReportDateForOrderCreatedAt }
import type { CategoryVatPercent } from '@/lib/order-vat'
import type { ZReportAmounts } from '@/lib/z-report-document'
import type { ZReportVatContext } from '@/lib/z-report-vat-context'
import { buildZReportDayAmountsFromOrders, type ZReportManualExtras } from '@/lib/z-report-day-builder'

export type ZReportMonthDayRow = {
  date: string
  orderCount: number
  subtotalExcl: number
  /** Som bonnen/orders — gelijk aan dag-Z scherm. */
  totalIncl: number
  /** Handmatige invoer (witte kassa buiten Vysion), apart van bonnen. */
  manualIncl?: number
  taxByRate: Record<CategoryVatPercent, number>
  baseByRate: Record<CategoryVatPercent, number>
  cashPayments: number
  cardPayments: number
  onlinePayments: number
}

export type ZReportMonthSentEntry = { sentAt: string; to: string }
export type ZReportMonthSentLog = Record<string, ZReportMonthSentEntry>

function emptyVatRecord(): Record<CategoryVatPercent, number> {
  return { 6: 0, 9: 0, 12: 0, 21: 0 }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function getLastDayOfMonthYmd(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0))
  return last.toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' })
}

/** Alle kalenderdagen in de maand, tot en met capYmd (meestal vandaag). */
export function listMonthDaysUpTo(yearMonth: string, capYmd: string): string[] {
  const first = `${yearMonth}-01`
  const monthEnd = getLastDayOfMonthYmd(yearMonth)
  const last = capYmd < monthEnd ? capYmd : monthEnd
  const out: string[] = []
  let d = first
  while (d <= last) {
    out.push(d)
    d = addDaysToBelgiumYMD(d, 1)
  }
  return out
}

export function sumZReportMonthAmounts(days: ZReportMonthDayRow[]): ZReportAmounts {
  const taxByRate = emptyVatRecord()
  const baseByRate = emptyVatRecord()
  let orderCount = 0
  let subtotalExcl = 0
  let totalIncl = 0
  let cashPayments = 0
  let cardPayments = 0
  let onlinePayments = 0

  for (const day of days) {
    orderCount += day.orderCount
    subtotalExcl = round2(subtotalExcl + day.subtotalExcl)
    totalIncl = round2(totalIncl + day.totalIncl)
    cashPayments = round2(cashPayments + day.cashPayments)
    cardPayments = round2(cardPayments + day.cardPayments)
    onlinePayments = round2(onlinePayments + day.onlinePayments)
    for (const rate of [6, 9, 12, 21] as CategoryVatPercent[]) {
      taxByRate[rate] = round2(taxByRate[rate] + (day.taxByRate[rate] || 0))
      baseByRate[rate] = round2(baseByRate[rate] + (day.baseByRate[rate] || 0))
    }
  }

  return {
    orderCount,
    subtotalExcl,
    totalIncl,
    taxByRate,
    baseByRate,
    cashPayments,
    cardPayments,
    onlinePayments,
  }
}

type ManualDayExtras = ZReportManualExtras

function buildDayRowFromOrders(
  date: string,
  dayOrders: Order[],
  tenantDefaultBtw: number,
  vatContext: ZReportVatContext,
  manual?: ManualDayExtras | null,
): ZReportMonthDayRow | null {
  const amounts = buildZReportDayAmountsFromOrders(dayOrders, tenantDefaultBtw, vatContext, manual)

  if (amounts.orderCount === 0 && amounts.manualTotalIncl <= 0) return null

  return {
    date,
    orderCount: amounts.orderCount,
    subtotalExcl: amounts.subtotalExcl,
    totalIncl: amounts.orderTotalIncl,
    manualIncl: amounts.manualTotalIncl > 0 ? amounts.manualTotalIncl : undefined,
    taxByRate: amounts.taxByRate,
    baseByRate: amounts.baseByRate,
    cashPayments: amounts.cashPayments,
    cardPayments: amounts.cardPayments,
    onlinePayments: amounts.onlinePayments,
  }
}

/** Groepeer orders op fiscale dag en bouw rijen (alleen dagen met omzet). */
export function buildZReportMonthDayRows(
  orders: Order[],
  yearMonth: string,
  capYmd: string,
  tenantDefaultBtw: number,
  vatContext: ZReportVatContext,
  manualByDate?: Record<string, ManualDayExtras>,
  hours: TenantHourRow[] = [],
): ZReportMonthDayRow[] {
  const counted = orders.filter((o) =>
    orderCountsTowardRevenueAndZReport(
      o as Pick<Order, 'order_type' | 'status' | 'payment_status'>,
    ),
  )

  const byDate = new Map<string, Order[]>()
  for (const o of counted) {
    const created = String(o.created_at || '')
    const fiscal = businessDayForOrder(created, hours)
    if (!fiscal || !fiscal.startsWith(yearMonth)) continue
    const list = byDate.get(fiscal) || []
    list.push(o)
    byDate.set(fiscal, list)
  }

  const days = listMonthDaysUpTo(yearMonth, capYmd)
  const rows: ZReportMonthDayRow[] = []

  for (const date of days) {
    const dayOrders = byDate.get(date) || []
    const manual = manualByDate?.[date]
    const row = buildDayRowFromOrders(date, dayOrders, tenantDefaultBtw, vatContext, manual)
    if (row) rows.push(row)
  }

  return rows
}

export function monthBoundsUtc(yearMonth: string, capYmd: string, hours: TenantHourRow[] = []): { startUTC: string; endUTC: string } {
  const first = `${yearMonth}-01`
  const listed = listMonthDaysUpTo(yearMonth, capYmd)
  const last = listed.length ? listed[listed.length - 1] : first
  const { startUTC } = getTenantBusinessDayBounds(first, hours)
  const { endUTC } = getTenantBusinessDayBounds(last, hours)
  return { startUTC, endUTC }
}

export function formatYearMonthLabel(yearMonth: string, locale = 'nl-BE'): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, 1))
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

export function addMonthsToYearMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function parseZReportMonthSentLog(raw: unknown): ZReportMonthSentLog {
  if (!raw || typeof raw !== 'object') return {}
  const out: ZReportMonthSentLog = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}$/.test(key)) continue
    if (!val || typeof val !== 'object') continue
    const e = val as Record<string, unknown>
    const sentAt = typeof e.sentAt === 'string' ? e.sentAt : ''
    const to = typeof e.to === 'string' ? e.to : ''
    if (sentAt && to) out[key] = { sentAt, to }
  }
  return out
}

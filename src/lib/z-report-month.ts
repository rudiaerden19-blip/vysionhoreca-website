/**
 * Z-rapport maandoverzicht — één mail met dagrijen + maandtotalen.
 */

import {
  distributeOrderPaymentForZRaport,
  orderCountsTowardRevenueAndZReport,
  type Order,
} from '@/lib/admin-api'
import { addDaysToBelgiumYMD, getBelgiumDateString, getZRapportDateBounds } from '@/lib/belgium-date-bounds'
import {
  aggregateZReportVatFromOrderRows,
  type CategoryVatPercent,
  type ZReportVatOrderSlice,
} from '@/lib/order-vat'
import type { ZReportAmounts } from '@/lib/z-report-document'
import type { ZReportVatContext } from '@/lib/z-report-vat-context'

export type ZReportMonthDayRow = {
  date: string
  orderCount: number
  subtotalExcl: number
  totalIncl: number
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

function brusselsHour(utc: Date): number {
  return Number(
    utc.toLocaleString('en-GB', {
      timeZone: 'Europe/Brussels',
      hour: 'numeric',
      hour12: false,
    }),
  )
}

/**
 * Fiscale werkdag voor een order — zelfde als dag-Z-rapport (`getZRapportDateBounds`).
 * Werkdag X = X 00:00 t/m X+1 12:00 (Europe/Brussels). Bonnen na middernacht vóór 12:00
 * horen bij de vorige werkdag, niet bij de nieuwe kalenderdag.
 */
export function fiscalReportDateForOrderCreatedAt(createdAt: string): string | null {
  const t = new Date(createdAt)
  if (Number.isNaN(t.getTime())) return null

  const center = getBelgiumDateString(t)
  const hour = brusselsHour(t)
  const fiscalYmd = hour < 12 ? addDaysToBelgiumYMD(center, -1) : center

  const { startUTC, endUTC } = getZRapportDateBounds(fiscalYmd)
  if (t >= new Date(startUTC) && t <= new Date(endUTC)) return fiscalYmd

  for (const ymd of [addDaysToBelgiumYMD(center, -1), center, addDaysToBelgiumYMD(center, 1)]) {
    const b = getZRapportDateBounds(ymd)
    if (t >= new Date(b.startUTC) && t <= new Date(b.endUTC)) return ymd
  }

  return fiscalYmd
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

type ManualDayExtras = {
  cash?: number
  card?: number
  online?: number
  total?: number
}

function buildDayRowFromOrders(
  date: string,
  dayOrders: Order[],
  tenantDefaultBtw: number,
  vatContext: ZReportVatContext,
  manual?: ManualDayExtras | null,
): ZReportMonthDayRow | null {
  let cashPayments = 0
  let cardPayments = 0
  let onlinePayments = 0
  let orderTotal = 0

  for (const order of dayOrders) {
    orderTotal = round2(orderTotal + (Number(order.total) || 0))
    const d = distributeOrderPaymentForZRaport(order)
    cashPayments = round2(cashPayments + d.cash)
    cardPayments = round2(cardPayments + d.card)
    onlinePayments = round2(onlinePayments + d.online)
  }

  const manualTotal = round2(Number(manual?.total) || 0)
  if (manualTotal > 0) {
    cashPayments = round2(cashPayments + (Number(manual?.cash) || 0))
    cardPayments = round2(cardPayments + (Number(manual?.card) || 0))
    onlinePayments = round2(onlinePayments + (Number(manual?.online) || 0))
    orderTotal = round2(orderTotal + manualTotal)
  }

  if (dayOrders.length === 0 && manualTotal <= 0) return null

  const vatSlice: ZReportVatOrderSlice[] = dayOrders.map((o) => ({
    total: o.total,
    items: (o as { items?: unknown }).items,
    order_type: o.order_type,
  }))

  const vatAgg = aggregateZReportVatFromOrderRows(vatSlice, tenantDefaultBtw, vatContext)
  const taxByRate = { ...vatAgg.taxByRate }
  const baseByRate = { ...vatAgg.baseByRate }

  let subtotalExcl = vatAgg.subtotalExcl
  const totalIncl = orderTotal

  if (manualTotal > 0 && dayOrders.length === 0) {
    const fb = tenantDefaultBtw === 9 ? 9 : tenantDefaultBtw === 21 ? 21 : 6
    const base = round2(manualTotal / (1 + fb / 100))
    const tax = round2(manualTotal - base)
    taxByRate[fb as CategoryVatPercent] = round2((taxByRate[fb as CategoryVatPercent] || 0) + tax)
    baseByRate[fb as CategoryVatPercent] = round2((baseByRate[fb as CategoryVatPercent] || 0) + base)
    subtotalExcl = round2(subtotalExcl + base)
  }

  return {
    date,
    orderCount: dayOrders.length,
    subtotalExcl,
    totalIncl,
    taxByRate,
    baseByRate,
    cashPayments,
    cardPayments,
    onlinePayments,
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
): ZReportMonthDayRow[] {
  const counted = orders.filter((o) =>
    orderCountsTowardRevenueAndZReport(
      o as Pick<Order, 'order_type' | 'status' | 'payment_status'>,
    ),
  )

  const byDate = new Map<string, Order[]>()
  for (const o of counted) {
    const created = String(o.created_at || '')
    const fiscal = fiscalReportDateForOrderCreatedAt(created)
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

export function monthBoundsUtc(yearMonth: string, capYmd: string): { startUTC: string; endUTC: string } {
  const first = `${yearMonth}-01`
  const listed = listMonthDaysUpTo(yearMonth, capYmd)
  const last = listed.length ? listed[listed.length - 1] : first
  const { startUTC } = getZRapportDateBounds(first)
  const { endUTC } = getZRapportDateBounds(last)
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

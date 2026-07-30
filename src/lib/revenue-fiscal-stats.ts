/**
 * Omzetstatistieken op fiscale werkdag — gelijk aan Z-rapport / bonnen.
 */

import {
  addDaysToBelgiumYMD,
  fiscalReportDateForOrderCreatedAt,
  getBelgiumDateString,
  getCurrentFiscalReportDate,
  getZRapportDateBounds,
} from '@/lib/belgium-date-bounds'
import {
  orderCountsTowardRevenueAndZReport,
  type Order,
} from '@/lib/admin-api-order-helpers'

export { getCurrentFiscalReportDate }

export type FiscalDayTotals = { orders: number; revenue: number }

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function listFiscalDaysEndingAt(endFiscalYmd: string, count: number): string[] {
  const out: string[] = []
  let d = endFiscalYmd
  for (let i = 0; i < count; i++) {
    out.unshift(d)
    d = addDaysToBelgiumYMD(d, -1)
  }
  return out
}

export function aggregateRevenueByFiscalDay(
  orders: unknown[],
  filter?: (o: Order) => boolean,
): Map<string, FiscalDayTotals> {
  const byDay = new Map<string, FiscalDayTotals>()
  const countFilter = filter ?? orderCountsTowardRevenueAndZReport

  for (const raw of orders) {
    const o = raw as Order
    if (!countFilter(o)) continue
    const created = String(o.created_at || '')
    const fiscal = fiscalReportDateForOrderCreatedAt(created)
    if (!fiscal) continue
    const total = Number(o.total) || 0
    const cur = byDay.get(fiscal) ?? { orders: 0, revenue: 0 }
    cur.orders += 1
    cur.revenue = round2(cur.revenue + total)
    byDay.set(fiscal, cur)
  }

  return byDay
}

export function sumFiscalDays(
  byDay: Map<string, FiscalDayTotals>,
  fiscalYmdList: string[],
): FiscalDayTotals {
  let orders = 0
  let revenue = 0
  for (const d of fiscalYmdList) {
    const t = byDay.get(d)
    if (t) {
      orders += t.orders
      revenue += t.revenue
    }
  }
  return { orders, revenue: round2(revenue) }
}

export function getDashboardFiscalPeriodStats(orders: unknown[], now = new Date()) {
  const todayFiscal = getCurrentFiscalReportDate(now)
  const yesterdayFiscal = addDaysToBelgiumYMD(todayFiscal, -1)
  const weekFiscalDays = listFiscalDaysEndingAt(todayFiscal, 7)
  const byDay = aggregateRevenueByFiscalDay(orders)

  const today = sumFiscalDays(byDay, [todayFiscal])
  const yesterday = sumFiscalDays(byDay, [yesterdayFiscal])
  const week = sumFiscalDays(byDay, weekFiscalDays)

  return {
    todayFiscalYmd: todayFiscal,
    yesterdayFiscalYmd: yesterdayFiscal,
    todayOrders: today.orders,
    todayRevenue: today.revenue,
    yesterdayOrders: yesterday.orders,
    yesterdayRevenue: yesterday.revenue,
    weekOrders: week.orders,
    weekRevenue: week.revenue,
  }
}

export function fetchRangeUtcForFiscalDays(fiscalYmdList: string[]): {
  startUTC: string
  endUTC: string
} {
  if (fiscalYmdList.length === 0) {
    const iso = new Date().toISOString()
    return { startUTC: iso, endUTC: iso }
  }
  const sorted = [...fiscalYmdList].sort()
  const { startUTC } = getZRapportDateBounds(sorted[0])
  const { endUTC } = getZRapportDateBounds(sorted[sorted.length - 1])
  return { startUTC, endUTC }
}

/** Z-rapport maandgrenzen (fiscale dagen) voor jaar/maand — geen import uit z-report-month (circular). */
export function monthBoundsUtcForYearMonth(
  year: number,
  month: number,
  capYmd?: string,
): { startUTC: string; endUTC: string; yearMonth: string; capYmd: string } {
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEnd = `${yearMonth}-${String(lastDay).padStart(2, '0')}`
  const today = getBelgiumDateString()
  const cap = capYmd ?? (today < monthEnd ? today : monthEnd)
  const { startUTC } = getZRapportDateBounds(`${yearMonth}-01`)
  const { endUTC } = getZRapportDateBounds(cap)
  return { startUTC, endUTC, yearMonth, capYmd: cap }
}

export function filterOrdersInFiscalMonth(
  orders: unknown[],
  yearMonth: string,
  filter?: (o: Order) => boolean,
): Order[] {
  const countFilter = filter ?? orderCountsTowardRevenueAndZReport
  const out: Order[] = []
  for (const raw of orders) {
    const o = raw as Order
    if (!countFilter(o)) continue
    const fiscal = fiscalReportDateForOrderCreatedAt(String(o.created_at || ''))
    if (!fiscal || !fiscal.startsWith(yearMonth)) continue
    out.push(o)
  }
  return out
}

/**
 * Omzetstatistieken op tenant-werkdag (openingsuren) — gelijk aan Z-rapport.
 */

import {
  addDaysToBelgiumYMD,
  getBelgiumDateString,
} from '@/lib/belgium-date-bounds'
import {
  businessDayForOrder,
  getCurrentBusinessDay,
  getTenantBusinessDayBounds,
  type TenantHourRow,
} from '@/lib/tenant-business-day'
import {
  orderCountsTowardRevenueAndZReport,
  type Order,
} from '@/lib/admin-api-order-helpers'

export { getCurrentBusinessDay as getCurrentFiscalReportDate }

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
  hours: TenantHourRow[] = [],
): Map<string, FiscalDayTotals> {
  const byDay = new Map<string, FiscalDayTotals>()
  const countFilter = filter ?? orderCountsTowardRevenueAndZReport

  for (const raw of orders) {
    const o = raw as Order
    if (!countFilter(o)) continue
    const created = String(o.created_at || '')
    const fiscal = businessDayForOrder(created, hours)
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

export function getDashboardFiscalPeriodStats(
  orders: unknown[],
  now = new Date(),
  hours: TenantHourRow[] = [],
) {
  const todayFiscal = getCurrentBusinessDay(now, hours)
  const yesterdayFiscal = addDaysToBelgiumYMD(todayFiscal, -1)
  const weekFiscalDays = listFiscalDaysEndingAt(todayFiscal, 7)
  const byDay = aggregateRevenueByFiscalDay(orders, undefined, hours)

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

export function fetchRangeUtcForFiscalDays(
  fiscalYmdList: string[],
  hours: TenantHourRow[] = [],
): {
  startUTC: string
  endUTC: string
} {
  if (fiscalYmdList.length === 0) {
    const iso = new Date().toISOString()
    return { startUTC: iso, endUTC: iso }
  }
  const sorted = [...fiscalYmdList].sort()
  const { startUTC } = getTenantBusinessDayBounds(sorted[0], hours)
  const { endUTC } = getTenantBusinessDayBounds(sorted[sorted.length - 1], hours)
  return { startUTC, endUTC }
}

/** Maandgrenzen op tenant-werkdag. */
export function monthBoundsUtcForYearMonth(
  year: number,
  month: number,
  capYmd?: string,
  hours: TenantHourRow[] = [],
): { startUTC: string; endUTC: string; yearMonth: string; capYmd: string } {
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEnd = `${yearMonth}-${String(lastDay).padStart(2, '0')}`
  const today = getBelgiumDateString()
  const cap = capYmd ?? (today < monthEnd ? today : monthEnd)
  const { startUTC } = getTenantBusinessDayBounds(`${yearMonth}-01`, hours)
  const { endUTC } = getTenantBusinessDayBounds(cap, hours)
  return { startUTC, endUTC, yearMonth, capYmd: cap }
}

export function filterOrdersInFiscalMonth(
  orders: unknown[],
  yearMonth: string,
  filter?: (o: Order) => boolean,
  hours: TenantHourRow[] = [],
): Order[] {
  const countFilter = filter ?? orderCountsTowardRevenueAndZReport
  const out: Order[] = []
  for (const raw of orders) {
    const o = raw as Order
    if (!countFilter(o)) continue
    const fiscal = businessDayForOrder(String(o.created_at || ''), hours)
    if (!fiscal || !fiscal.startsWith(yearMonth)) continue
    out.push(o)
  }
  return out
}

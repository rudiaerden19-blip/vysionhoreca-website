import {
  fiscalReportDateForOrderCreatedAt,
  getCurrentFiscalReportDate,
  getZRapportDateBounds,
} from '@/lib/belgium-date-bounds'
import type { Order } from '@/lib/admin-api-order-helpers'
import {
  aggregateRevenueByFiscalDay,
  getDashboardFiscalPeriodStats,
  monthBoundsUtcForYearMonth,
} from '@/lib/revenue-fiscal-stats'
import { buildZReportMonthDayRows, sumZReportMonthAmounts } from '@/lib/z-report-month'
import type { ZReportVatContext } from '@/lib/z-report-vat-context'

const emptyVatContext: ZReportVatContext = {
  categoryById: new Map(),
  productCategoryById: new Map(),
  productCategoryByNormalizedName: new Map(),
}

function makeOrder(createdAt: string, total: number, id: string): Order {
  return {
    id,
    tenant_slug: 'demo',
    customer_name: 'Test',
    status: 'confirmed',
    payment_status: 'paid',
    order_type: 'TAKEAWAY',
    subtotal: total,
    total,
    created_at: createdAt,
    items: [{ name: 'Item', quantity: 1, price: total }],
  }
}

describe('revenue-fiscal-stats alignment with Z month', () => {
  it('dashboard today matches fiscal day Z bounds total', () => {
    const orders = [
      makeOrder('2026-05-24T08:00:00.000Z', 10, 'a'),
      makeOrder('2026-05-24T10:00:00.000Z', 20, 'b'),
    ]
    const fiscal = fiscalReportDateForOrderCreatedAt('2026-05-24T10:00:00.000Z')
    expect(fiscal).toBe('2026-05-24')

    const dayBounds = getZRapportDateBounds(fiscal!)
    const inDay = orders.filter((o) => {
      const t = new Date(o.created_at!)
      return t >= new Date(dayBounds.startUTC) && t <= new Date(dayBounds.endUTC)
    })
    const dayTotal = inDay.reduce((s, o) => s + o.total!, 0)

    const stats = getDashboardFiscalPeriodStats(orders, new Date('2026-05-24T14:00:00.000Z'))
    expect(stats.todayFiscalYmd).toBe('2026-05-24')
    expect(stats.todayRevenue).toBe(dayTotal)
    expect(stats.todayOrders).toBe(inDay.length)
  })

  it('month dashboard aggregate matches buildZReportMonthDayRows sum', () => {
    const orders = [
      makeOrder('2026-05-23T22:00:00.000Z', 5, '1'),
      makeOrder('2026-05-24T08:00:00.000Z', 8, '2'),
      makeOrder('2026-05-24T10:00:00.000Z', 12, '3'),
      makeOrder('2026-06-01T09:00:00.000Z', 43.8, '4'),
    ]

    const yearMonth = '2026-05'
    const capYmd = '2026-05-31'
    const monthRows = buildZReportMonthDayRows(orders, yearMonth, capYmd, 9, emptyVatContext)
    const monthSum = sumZReportMonthAmounts(monthRows)

    const byDay = aggregateRevenueByFiscalDay(orders)
    let fiscalMonthTotal = 0
    let fiscalMonthOrders = 0
    for (const [ymd, t] of byDay) {
      if (!ymd.startsWith(yearMonth)) continue
      fiscalMonthTotal += t.revenue
      fiscalMonthOrders += t.orders
    }

    expect(fiscalMonthTotal).toBe(monthSum.totalIncl)
    expect(fiscalMonthOrders).toBe(monthSum.orderCount)
  })

  it('monthBoundsUtcForYearMonth matches z-report-month monthBoundsUtc', () => {
    const fromHelper = monthBoundsUtcForYearMonth(2026, 5, '2026-05-24')
    const { monthBoundsUtc } = require('@/lib/z-report-month') as typeof import('@/lib/z-report-month')
    const fromZ = monthBoundsUtc('2026-05', '2026-05-24')
    expect(fromHelper.startUTC).toBe(fromZ.startUTC)
    expect(fromHelper.endUTC).toBe(fromZ.endUTC)
  })
})

describe('getCurrentFiscalReportDate', () => {
  it('returns same fiscal label as order at that instant', () => {
    const now = new Date('2026-05-24T08:00:00.000Z')
    expect(getCurrentFiscalReportDate(now)).toBe(
      fiscalReportDateForOrderCreatedAt(now.toISOString()),
    )
  })
})

import {
  fiscalReportDateForOrderCreatedAt,
  getZRapportDateBounds,
} from '@/lib/belgium-date-bounds'
import { buildZReportDayAmountsFromOrders } from '@/lib/z-report-day-builder'
import { buildZReportMonthDayRows } from '@/lib/z-report-month'
import type { Order } from '@/lib/admin-api-order-helpers'
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

describe('dag vs maand Z-rapport (fiscale grens)', () => {
  it('dag 24/05 en maandrij 24/05 tellen dezelfde bonnen (geen 00:00-12:00 leak)', () => {
    const orders = [
      makeOrder('2026-05-24T08:00:00.000Z', 2.6, 'early-morning-23'),
      makeOrder('2026-05-24T10:00:00.000Z', 100, 'noon-24'),
      makeOrder('2026-05-24T14:00:00.000Z', 50, 'afternoon-24'),
    ]

    const { startUTC, endUTC } = getZRapportDateBounds('2026-05-24')
    const inWindow = orders.filter(
      (o) =>
        o.created_at &&
        new Date(o.created_at) >= new Date(startUTC) &&
        new Date(o.created_at) <= new Date(endUTC),
    )

    const dayAmounts = buildZReportDayAmountsFromOrders(inWindow, 9, emptyVatContext)
    const monthRows = buildZReportMonthDayRows(
      orders,
      '2026-05',
      '2026-05-31',
      9,
      emptyVatContext,
    )
    const row24 = monthRows.find((r) => r.date === '2026-05-24')

    expect(fiscalReportDateForOrderCreatedAt('2026-05-24T08:00:00.000Z')).toBe('2026-05-23')
    expect(dayAmounts.orderCount).toBe(2)
    expect(dayAmounts.orderTotalIncl).toBe(150)
    expect(row24?.orderCount).toBe(2)
    expect(row24?.totalIncl).toBe(150)
  })
})

import { buildZReportDayAmountsFromOrders } from '@/lib/z-report-day-builder'
import { buildZReportMonthDayRows } from '@/lib/z-report-month'
import type { Order } from '@/lib/admin-api-order-helpers'
import { businessDayForOrder, getTenantBusinessDayBounds } from '@/lib/tenant-business-day'
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

describe('dag vs maand Z-rapport (tenant werkdag)', () => {
  it('dag 24/05 en maandrij 24/05 tellen dezelfde bonnen (openingsuren leeg = kalenderdag)', () => {
    const hours: import('@/lib/tenant-business-day').TenantHourRow[] = []
    const orders = [
      makeOrder('2026-05-24T08:00:00.000Z', 2.6, 'morning'),
      makeOrder('2026-05-24T10:00:00.000Z', 100, 'noon'),
      makeOrder('2026-05-24T14:00:00.000Z', 50, 'afternoon'),
    ]

    const reportDate = '2026-05-24'
    const { startUTC, endUTC } = getTenantBusinessDayBounds(reportDate, hours)
    const inWindow = orders.filter((o) => {
      if (!o.created_at) return false
      const t = new Date(o.created_at)
      return (
        businessDayForOrder(o.created_at, hours) === reportDate &&
        t >= new Date(startUTC) &&
        t <= new Date(endUTC)
      )
    })

    const dayAmounts = buildZReportDayAmountsFromOrders(inWindow, 9, emptyVatContext)
    const monthRows = buildZReportMonthDayRows(
      orders,
      '2026-05',
      '2026-05-31',
      9,
      emptyVatContext,
      undefined,
      hours,
    )
    const row24 = monthRows.find((r) => r.date === reportDate)

    expect(dayAmounts.orderCount).toBe(3)
    expect(dayAmounts.orderTotalIncl).toBe(152.6)
    expect(row24?.orderCount).toBe(3)
    expect(row24?.totalIncl).toBe(152.6)
  })
})

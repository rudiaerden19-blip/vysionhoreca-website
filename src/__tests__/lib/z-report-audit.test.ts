import { buildZReportDayAmountsFromOrders } from '@/lib/z-report-day-builder'
import { buildZReportMonthDayRows, sumZReportMonthAmounts } from '@/lib/z-report-month'
import type { Order } from '@/lib/admin-api-order-helpers'
import type { ZReportVatContext } from '@/lib/z-report-vat-context'

const emptyCtx: ZReportVatContext = {
  categoryById: new Map(),
  productCategoryById: new Map(),
  productCategoryByNormalizedName: new Map(),
}

function order(id: string, createdAt: string, total: number): Order {
  return {
    id,
    tenant_slug: 'demo',
    customer_name: 'T',
    status: 'confirmed',
    payment_status: 'paid',
    order_type: 'TAKEAWAY',
    subtotal: total,
    total,
    created_at: createdAt,
    items: [{ name: 'X', quantity: 1, price: total }],
  }
}

describe('z-report-audit logic (synthetic)', () => {
  it('dag-builder en maandrij zijn gelijk voor dezelfde fiscale dag', () => {
    const orders = [
      order('a', '2026-06-01T14:00:00.000Z', 20),
      order('b', '2026-06-01T16:00:00.000Z', 15.8),
    ]
    const day = buildZReportDayAmountsFromOrders(orders, 9, emptyCtx)
    const monthRows = buildZReportMonthDayRows(orders, '2026-06', '2026-06-30', 9, emptyCtx)
    const row = monthRows.find((r) => r.date === '2026-06-01')
    expect(row?.totalIncl).toBe(day.orderTotalIncl)
    expect(row?.orderCount).toBe(day.orderCount)
    const sum = sumZReportMonthAmounts(monthRows)
    expect(sum.totalIncl).toBe(day.orderTotalIncl)
  })
})

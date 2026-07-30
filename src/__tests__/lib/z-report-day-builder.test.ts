import { buildZReportDayAmountsFromOrders } from '@/lib/z-report-day-builder'
import { buildZReportVatContext } from '@/lib/z-report-vat-context'
import type { Order } from '@/lib/admin-api-order-helpers'

describe('buildZReportDayAmountsFromOrders', () => {
  const foodCatId = 'cat-food'
  const ctx = buildZReportVatContext(
    [{ id: foodCatId, default_btw_percentage: 6 }],
    [{ id: 'p1', name: 'Friet', category_id: foodCatId }],
  )

  const paidKassaOrder: Order = {
    tenant_slug: 'demo',
    customer_name: 'Test',
    status: 'confirmed',
    payment_status: 'paid',
    order_type: 'TAKEAWAY',
    subtotal: 6,
    total: 6,
    items: [{ name: 'Friet', quantity: 1, price: 6, product_id: 'p1' }] as unknown as Order['items'],
  }

  it('telt alleen betaalde kassa-orders', () => {
    const unpaid: Order = { ...paidKassaOrder, payment_status: 'pending' }
    const amounts = buildZReportDayAmountsFromOrders(
      [paidKassaOrder, unpaid],
      6,
      ctx,
    )
    expect(amounts.orderCount).toBe(1)
    expect(amounts.orderTotalIncl).toBe(6)
  })

  it('manual blijft apart van orderTotalIncl', () => {
    const amounts = buildZReportDayAmountsFromOrders([paidKassaOrder], 6, ctx, {
      total: 50,
      cash: 50,
    })
    expect(amounts.orderTotalIncl).toBe(6)
    expect(amounts.manualTotalIncl).toBe(50)
    expect(amounts.grandTotalIncl).toBe(56)
    expect(amounts.cashPayments).toBe(0)
  })
})

import { buildKasboekPaymentLines, sumKasboekPaymentLines } from '@/lib/kasboek-payments'
import type { Order } from '@/lib/admin-api-order-helpers'

function order(partial: Partial<Order> & Pick<Order, 'order_type' | 'payment_status'>): Order {
  return {
    id: 'o1',
    tenant_slug: 'demo',
    order_number: 12,
    customer_name: 'Test',
    status: 'completed',
    subtotal: 10,
    total: 10,
    created_at: '2026-09-23T10:00:00.000Z',
    payment_method: 'cash',
    ...partial,
  } as Order
}

describe('buildKasboekPaymentLines', () => {
  it('zet contant, kaart en online elk op een eigen regel', () => {
    const lines = buildKasboekPaymentLines([
      order({ id: 'c', payment_method: 'CASH', payment_status: 'paid', order_type: 'TAKEAWAY', total: 4 }),
      order({ id: 'k', payment_method: 'CARD', payment_status: 'paid', order_type: 'DINE_IN', total: 6 }),
      order({
        id: 'o',
        payment_method: 'ideal',
        payment_status: 'paid',
        status: 'confirmed',
        order_type: 'pickup',
        total: 8,
      }),
    ])
    expect(lines.map((l) => l.method)).toEqual(['cash', 'card', 'online'])
    expect(lines.map((l) => l.amount)).toEqual([4, 6, 8])
    expect(lines.map((l) => l.channel)).toEqual(['pos', 'pos', 'online'])
    expect(sumKasboekPaymentLines(lines)).toMatchObject({ cash: 4, card: 6, online: 8, total: 18, count: 3 })
  })

  it('splitst een gemengde betaling in contant en kaart', () => {
    const lines = buildKasboekPaymentLines([
      order({
        id: 's',
        payment_method: 'split',
        payment_status: 'paid',
        order_type: 'TAKEAWAY',
        total: 12.5,
        payment_split_cash: 5,
        payment_split_card: 7.5,
      }),
    ])
    expect(lines).toHaveLength(2)
    expect(lines.map((l) => [l.method, l.amount])).toEqual([
      ['cash', 5],
      ['card', 7.5],
    ])
  })

  it('slaat onbetaalde kassa en geannuleerde orders over', () => {
    const lines = buildKasboekPaymentLines([
      order({ id: 'u', payment_status: 'pending', order_type: 'TAKEAWAY', total: 9 }),
      order({ id: 'x', payment_status: 'paid', status: 'cancelled', order_type: 'TAKEAWAY', total: 9 }),
      order({ id: 'ok', payment_status: 'paid', order_type: 'TAKEAWAY', total: 3 }),
    ])
    expect(lines).toHaveLength(1)
    expect(lines[0].amount).toBe(3)
  })
})

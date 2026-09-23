import {
  cashDifferenceCents,
  eurosToCents,
  expectedCashCents,
  orderBelongsToCashbookDay,
  summarizeCashbookOrders,
  vatLinesFromAggregate,
} from '@/lib/cashbook-calc'
import type { Order } from '@/lib/admin-api-order-helpers'
import type { TenantHourRow } from '@/lib/tenant-business-day'

function order(partial: Partial<Order> & Pick<Order, 'order_type' | 'payment_status'>): Order {
  return {
    id: 'o1',
    tenant_slug: 'zaak-a',
    order_number: 1,
    status: 'completed',
    total: 10,
    created_at: '2026-09-23T16:00:00.000Z',
    payment_method: 'cash',
    ...partial,
  } as Order
}

const overnight: TenantHourRow[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day_of_week: day,
  is_open: true,
  open_time: '11:00',
  close_time: '01:00',
}))

describe('cashbook berekening', () => {
  it('rekent euro naar centen zonder komma-afronding te verliezen', () => {
    expect(eurosToCents(7.5)).toBe(750)
    expect(eurosToCents(0.1 + 0.2)).toBe(30)
  })

  it('zet contant, kaart en een gemengde betaling in de juiste bak', () => {
    const { payments } = summarizeCashbookOrders(
      [
        order({ id: 'c', payment_method: 'CASH', payment_status: 'paid', order_type: 'TAKEAWAY', total: 4 }),
        order({ id: 'k', payment_method: 'CARD', payment_status: 'paid', order_type: 'DINE_IN', total: 6 }),
        order({
          id: 's',
          payment_method: 'split',
          payment_status: 'paid',
          order_type: 'TAKEAWAY',
          total: 12.5,
          payment_split_cash: 5,
          payment_split_card: 7.5,
        }),
      ],
      [],
      '2026-09-23',
    )
    expect(payments.cashCents).toBe(400 + 500)
    expect(payments.cardCents).toBe(600 + 750)
    expect(payments.onlineCents).toBe(0)
    expect(payments.grossCents).toBe(400 + 600 + 1250)
    expect(payments.count).toBe(3)
  })

  it('houdt een verkoop na middernacht bij de dag die nog open was', () => {
    const at = '2026-09-23T22:30:00.000Z'
    expect(orderBelongsToCashbookDay(at, '2026-09-23', overnight)).toBe(true)
    expect(orderBelongsToCashbookDay(at, '2026-09-24', overnight)).toBe(false)
    const { payments } = summarizeCashbookOrders(
      [order({ payment_status: 'paid', order_type: 'TAKEAWAY', total: 8, created_at: at })],
      overnight,
      '2026-09-23',
    )
    expect(payments.cashCents).toBe(800)
  })

  it('telt geannuleerde bestellingen niet mee en toont korting apart', () => {
    const { payments, cancelledCount, cancelledCents } = summarizeCashbookOrders(
      [
        order({
          id: 'ok',
          payment_status: 'paid',
          order_type: 'TAKEAWAY',
          total: 10,
          discount_amount: 1.5,
        }),
        order({
          id: 'x',
          payment_status: 'paid',
          status: 'cancelled',
          order_type: 'TAKEAWAY',
          total: 9,
        }),
      ],
      [],
      '2026-09-23',
    )
    expect(payments.grossCents).toBe(1000)
    expect(payments.discountCents).toBe(150)
    expect(cancelledCount).toBe(1)
    expect(cancelledCents).toBe(900)
  })

  it('zet een negatief betaald bedrag bij de retouren', () => {
    const { payments } = summarizeCashbookOrders(
      [order({ payment_status: 'paid', order_type: 'TAKEAWAY', total: -4, payment_method: 'CASH' })],
      [],
      '2026-09-23',
    )
    expect(payments.refundCents).toBe(-400)
    expect(payments.cashCents).toBe(-400)
  })

  it('berekent verwacht kassaldo, cash-in, cash-out en bankstorting', () => {
    const expected = expectedCashCents({
      openingCents: 15000,
      cashSalesCents: 47500,
      movements: [
        { type: 'cash_in', amountCents: 2000 },
        { type: 'float_in', amountCents: 0 },
        { type: 'cash_out', amountCents: 4300 },
        { type: 'bank_deposit', amountCents: 40000 },
        { type: 'take_out', amountCents: 0 },
        { type: 'petty_expense', amountCents: 0 },
      ],
    })
    expect(expected).toBe(15000 + 47500 + 2000 - 4300 - 40000)
  })

  it('geeft een positief en een negatief kasverschil', () => {
    expect(cashDifferenceCents(20200, 20000)).toBe(200)
    expect(cashDifferenceCents(20000, 20200)).toBe(-200)
  })

  it('toont 6, 12 en 21 procent apart', () => {
    const lines = vatLinesFromAggregate({
      taxByRate: { 6: 6, 9: 0, 12: 12, 21: 21 },
      baseByRate: { 6: 100, 9: 0, 12: 100, 21: 100 },
    })
    expect(lines.map((l) => [l.rate, l.taxCents, l.inclCents])).toEqual([
      [6, 600, 10600],
      [12, 1200, 11200],
      [21, 2100, 12100],
    ])
  })
})

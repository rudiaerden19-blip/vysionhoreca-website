import {
  distributeOrderPaymentForZRaport,
  orderCountsTowardRevenueAndZReport,
} from '@/lib/admin-api-order-helpers'

/** Kernlogica voor omzet/Z-rapport — stabiel houden bij statuswijzigingen. */
describe('admin-api-order-helpers (Z-rapport / revenue gate)', () => {
  it('webshop: confirmed counts; new without paid does not', () => {
    expect(
      orderCountsTowardRevenueAndZReport({
        order_type: 'pickup',
        status: 'confirmed',
        payment_status: 'pending',
      })
    ).toBe(true)
    expect(
      orderCountsTowardRevenueAndZReport({
        order_type: 'pickup',
        status: 'new',
        payment_status: 'pending',
      })
    ).toBe(false)
  })

  it('webshop: paid counts even if status still new', () => {
    expect(
      orderCountsTowardRevenueAndZReport({
        order_type: 'delivery',
        status: 'new',
        payment_status: 'paid',
      })
    ).toBe(true)
  })

  it('POS: only paid counts', () => {
    expect(
      orderCountsTowardRevenueAndZReport({
        order_type: 'TAKEAWAY',
        status: 'completed',
        payment_status: 'paid',
      })
    ).toBe(true)
    expect(
      orderCountsTowardRevenueAndZReport({
        order_type: 'TAKEAWAY',
        status: 'completed',
        payment_status: 'pending',
      })
    ).toBe(false)
  })

  it('rejected never counts', () => {
    expect(
      orderCountsTowardRevenueAndZReport({
        order_type: 'pickup',
        status: 'rejected',
        payment_status: 'paid',
      })
    ).toBe(false)
  })

  it('distributeOrderPaymentForZRaport handles split cash/card', () => {
    expect(
      distributeOrderPaymentForZRaport({
        total: 100,
        payment_method: 'split',
        payment_split_cash: 40,
        payment_split_card: 60,
      })
    ).toEqual({ cash: 40, card: 60, online: 0 })
  })
})

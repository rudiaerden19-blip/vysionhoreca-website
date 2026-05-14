import {
  aggregateOrderTotalsKassaVsOnline,
  distributeOrderPaymentForZRaport,
  orderCountsTowardRevenueAndZReport,
  isWebshopChannelNewOrder,
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

  it('aggregateOrderTotalsKassaVsOnline splits POS vs webshop like rapporten', () => {
    const r = aggregateOrderTotalsKassaVsOnline([
      { order_type: 'DINE_IN', total: 10 },
      { order_type: 'pickup', total: 25 },
    ])
    expect(r.kassaSalesTotal).toBe(10)
    expect(r.onlineSalesTotal).toBe(25)
    expect(r.kassaOrderCount).toBe(1)
    expect(r.onlineOrderCount).toBe(1)
  })
})

describe('isWebshopChannelNewOrder (kassa alarm alleen web)', () => {
  it('includes webshop pickup / delivery / group', () => {
    expect(isWebshopChannelNewOrder({ order_type: 'pickup' })).toBe(true)
    expect(isWebshopChannelNewOrder({ order_type: 'delivery' })).toBe(true)
    expect(isWebshopChannelNewOrder({ order_type: 'group' })).toBe(true)
  })

  it('excludes all POS order types even if lowercased elsewhere', () => {
    expect(isWebshopChannelNewOrder({ order_type: 'DINE_IN' })).toBe(false)
    expect(isWebshopChannelNewOrder({ order_type: 'TAKEAWAY' })).toBe(false)
    expect(isWebshopChannelNewOrder({ order_type: 'DELIVERY' })).toBe(false)
  })
})

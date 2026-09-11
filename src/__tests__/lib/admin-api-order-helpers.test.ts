import {
  distributeOrderPaymentForZRaport,
  orderCountsTowardRevenueAndZReport,
  isWebshopChannelNewOrder,
  shopMustHideUnpaidOnlineWebshopOrder,
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

describe('isWebshopChannelNewOrder (kassa alarm alleen web)', () => {
  it('includes webshop pickup / delivery / group', () => {
    expect(isWebshopChannelNewOrder({ order_type: 'pickup'})).toBe(true)
    expect(isWebshopChannelNewOrder({ order_type: 'delivery'})).toBe(true)
    expect(isWebshopChannelNewOrder({ order_type: 'group'})).toBe(true)
  })

  it('excludes all POS order types even if lowercased elsewhere', () => {
    expect(isWebshopChannelNewOrder({ order_type: 'DINE_IN'})).toBe(false)
    expect(isWebshopChannelNewOrder({ order_type: 'TAKEAWAY'})).toBe(false)
    expect(isWebshopChannelNewOrder({ order_type: 'DELIVERY'})).toBe(false)
  })

  it('negeert online webshop tot Stripe betaald is', () => {
    expect(
      isWebshopChannelNewOrder({
        order_type: 'pickup',
        payment_method: 'online',
        payment_status: 'pending',
        status: 'awaiting_payment',
      }),
    ).toBe(false)
    expect(
      isWebshopChannelNewOrder({
        order_type: 'pickup',
        payment_method: 'online',
        payment_status: 'paid',
        status: 'new',
      }),
    ).toBe(true)
  })
})

describe('shopMustHideUnpaidOnlineWebshopOrder', () => {
  it('verbergt Bancontact tot paid; cash bij afhalen blijft zichtbaar', () => {
    expect(
      shopMustHideUnpaidOnlineWebshopOrder({
        order_type: 'pickup',
        payment_method: 'online',
        payment_status: 'pending',
        status: 'awaiting_payment',
      }),
    ).toBe(true)
    expect(
      shopMustHideUnpaidOnlineWebshopOrder({
        order_type: 'pickup',
        payment_method: 'cash',
        payment_status: 'pending',
        status: 'new',
      }),
    ).toBe(false)
    expect(
      shopMustHideUnpaidOnlineWebshopOrder({
        order_type: 'pickup',
        payment_method: 'online',
        payment_status: 'paid',
        status: 'new',
      }),
    ).toBe(false)
  })
})

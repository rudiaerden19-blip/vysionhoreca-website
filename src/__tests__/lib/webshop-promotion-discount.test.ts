import {
  calculateAutomaticPromotionDiscount,
  parsePromotionExpiryDate,
} from '@/lib/webshop-promotion-discount'
import type { Promotion } from '@/lib/admin-api'

const basePromo = (over: Partial<Promotion>): Promotion => ({
  tenant_slug: 'any-tenant',
  name: 'Test',
  type: 'percentage',
  value: 50,
  min_order_amount: 0,
  usage_count: 0,
  max_usage_per_customer: 1,
  is_active: true,
  ...over,
})

describe('calculateAutomaticPromotionDiscount', () => {
  it('past percentage alleen toe op basisprijs van gekoppeld product', () => {
    const promos = [basePromo({ product_id: 'friet-id', value: 50, type: 'percentage' })]
    const cart = [
      { id: 'friet-id', price: 3, totalPrice: 3.6, quantity: 1 },
      { id: 'snack-id', price: 3, totalPrice: 3, quantity: 1 },
    ]
    expect(calculateAutomaticPromotionDiscount(cart, promos, 6.6, 'any-tenant')).toBe(1.5)
  })

  it('past geen order-brede percentage auto-korting toe zonder product_id', () => {
    const promos = [basePromo({ value: 50, type: 'percentage' })]
    const cart = [{ id: 'a', price: 10, totalPrice: 10, quantity: 1 }]
    expect(calculateAutomaticPromotionDiscount(cart, promos, 10, 'any-tenant')).toBe(0)
  })

  it('respecteert min_order_amount', () => {
    const promos = [basePromo({ product_id: 'x', min_order_amount: 20, value: 50 })]
    const cart = [{ id: 'x', price: 4, totalPrice: 4, quantity: 1 }]
    expect(calculateAutomaticPromotionDiscount(cart, promos, 4, 'any-tenant')).toBe(0)
  })

  it('fixedPrice korting alleen op productbasis', () => {
    const promos = [basePromo({ product_id: 'f', type: 'fixedPrice', value: 2 })]
    const cart = [{ id: 'f', price: 3, totalPrice: 3.5, quantity: 1 }]
    expect(calculateAutomaticPromotionDiscount(cart, promos, 3.5, 'any-tenant')).toBe(1)
  })

  it('negeert promoties van andere tenants', () => {
    const promos = [basePromo({ tenant_slug: 'other-zaak', product_id: 'f', value: 50 })]
    const cart = [{ id: 'f', price: 4, totalPrice: 4, quantity: 1 }]
    expect(calculateAutomaticPromotionDiscount(cart, promos, 4, 'mijn-zaak')).toBe(0)
  })

  it('matcht product-id case-insensitive (uuid)', () => {
    const promos = [
      basePromo({
        product_id: 'A1B2C3D4-1111-2222-3333-444444444444',
        value: 50,
        type: 'percentage',
      }),
    ]
    const cart = [
      {
        id: 'a1b2c3d4-1111-2222-3333-444444444444',
        price: 3,
        totalPrice: 3.6,
        quantity: 1,
      },
    ]
    expect(calculateAutomaticPromotionDiscount(cart, promos, 3.6, 'any-tenant')).toBe(1.5)
  })

  it('promotie met einddatum YYYY-MM-DD blijft geldig tot einde van die dag', () => {
    const ymd = '2030-06-15'
    const promos = [
      basePromo({
        product_id: 'f',
        value: 50,
        expires_at: ymd,
      }),
    ]
    const cart = [{ id: 'f', price: 4, totalPrice: 4, quantity: 1 }]
    const noonUtc = new Date(`${ymd}T12:00:00.000Z`)
    expect(
      calculateAutomaticPromotionDiscount(cart, promos, 4, 'any-tenant', noonUtc),
    ).toBe(2)
    expect(parsePromotionExpiryDate(ymd)?.toISOString()).toBe(`${ymd}T23:59:59.999Z`)
  })
})

import { calculateAutomaticPromotionDiscount } from '@/lib/webshop-promotion-discount'
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
  it('past percentage toe op gekoppeld product', () => {
    const promos = [basePromo({ product_id: 'friet-id', value: 50, type: 'percentage' })]
    const cart = [{ id: 'friet-id', totalPrice: 4.1, quantity: 1 }]
    expect(calculateAutomaticPromotionDiscount(cart, promos, 4.1)).toBe(2.05)
  })

  it('past percentage toe op hele mand zonder product_id', () => {
    const promos = [basePromo({ value: 10, type: 'percentage' })]
    const cart = [{ id: 'a', totalPrice: 10, quantity: 1 }]
    expect(calculateAutomaticPromotionDiscount(cart, promos, 10)).toBe(1)
  })

  it('respecteert min_order_amount', () => {
    const promos = [basePromo({ min_order_amount: 20, value: 50 })]
    const cart = [{ id: 'x', totalPrice: 4, quantity: 1 }]
    expect(calculateAutomaticPromotionDiscount(cart, promos, 4)).toBe(0)
  })

  it('kapt korting af op subtotaal', () => {
    const promos = [basePromo({ value: 100, type: 'percentage' })]
    const cart = [{ id: 'x', totalPrice: 5, quantity: 1 }]
    expect(calculateAutomaticPromotionDiscount(cart, promos, 5)).toBe(5)
  })
})

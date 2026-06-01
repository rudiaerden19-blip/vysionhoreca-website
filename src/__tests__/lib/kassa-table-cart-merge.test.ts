import { mergeCartLinesForTable } from '@/lib/kassa-table-cart-merge'
import type { KassaCartItem } from '@/lib/kassa-cart-types'

function line(id: string, qty: number, cartKey?: string): KassaCartItem {
  return {
    product: {
      id,
      tenant_slug: 't',
      category_id: null,
      name: `Product ${id}`,
      description: '',
      price: 2,
      image_url: '',
      is_active: true,
      is_popular: false,
      sort_order: 0,
      allergens: [],
    },
    quantity: qty,
    cartKey: cartKey ?? id,
  }
}

describe('mergeCartLinesForTable', () => {
  it('merges parked lines with new cart round by cartKey', () => {
    const parked = [line('cola', 1)]
    const round = [line('friet', 2)]
    const merged = mergeCartLinesForTable(parked, round)
    expect(merged).toHaveLength(2)
    expect(merged.find((l) => l.cartKey === 'cola')?.quantity).toBe(1)
    expect(merged.find((l) => l.cartKey === 'friet')?.quantity).toBe(2)
  })

  it('adds quantities for same cartKey', () => {
    const parked = [line('cola', 1)]
    const round = [line('cola', 1)]
    const merged = mergeCartLinesForTable(parked, round)
    expect(merged).toHaveLength(1)
    expect(merged[0].quantity).toBe(2)
  })
})

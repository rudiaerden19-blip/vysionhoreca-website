import { transferParkedTableOrder } from '@/lib/kassa-table-order-transfer'
import type { KassaCartItem } from '@/lib/kassa-cart-types'

function line(cartKey: string, qty: number): KassaCartItem {
  return {
    cartKey,
    quantity: qty,
    product: { id: cartKey, name: cartKey, price: 5 },
  } as KassaCartItem
}

describe('transferParkedTableOrder', () => {
  it('verplaatst regels en leegt bron', () => {
    const orders = {
      'inside|1': [line('a', 2)],
      'inside|2': [],
    }
    const result = transferParkedTableOrder(orders, 'inside|1', 'inside|2')
    expect(result?.movedLineCount).toBe(1)
    expect(result?.next['inside|1']).toEqual([])
    expect(result?.next['inside|2'][0]?.quantity).toBe(2)
  })

  it('merge bij bestaande mand op doeltafel', () => {
    const orders = {
      'inside|1': [line('a', 1)],
      'inside|2': [line('a', 2), line('b', 1)],
    }
    const result = transferParkedTableOrder(orders, 'inside|1', 'inside|2')
    expect(result?.next['inside|2']).toHaveLength(2)
    expect(result?.next['inside|2'].find((l) => l.cartKey === 'a')?.quantity).toBe(3)
  })

  it('geen-op bij lege bron of zelfde slot', () => {
    expect(transferParkedTableOrder({}, 'inside|1', 'inside|2')).toBeNull()
    expect(transferParkedTableOrder({ 'inside|1': [line('a', 1)] }, 'inside|1', 'inside|1')).toBeNull()
  })
})

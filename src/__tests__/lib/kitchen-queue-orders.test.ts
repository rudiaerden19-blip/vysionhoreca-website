import { isKitchenQueueOrder, parseOrdersItemsJson } from '@/lib/kitchen-queue-orders'

const itemsOne = [{ quantity: 1, name: 'Bier'}]

describe('kitchen-queue-orders', () => {
  describe('parseOrdersItemsJson', () => {
    it('parses string items JSON', () => {
      const rows = [{ id: 'a', items: JSON.stringify([{ quantity: 2 }]) }]
      const out = parseOrdersItemsJson(rows as Record<string, unknown>[])
      expect(out[0].items).toEqual([{ quantity: 2 }])
    })
  })

  describe('isKitchenQueueOrder', () => {
    it('shows open DINE_IN cart with items', () => {
      expect(
        isKitchenQueueOrder({
          status: 'open',
          order_type: 'DINE_IN',
          payment_status: 'pending',
          items: itemsOne,
        }),
      ).toBe(true)
    })

    it('hides empty carts', () => {
      expect(
        isKitchenQueueOrder({
          status: 'open',
          order_type: 'DINE_IN',
          items: [],
        }),
      ).toBe(false)
    })

    /** Regression: na afrekenen aan tafel insert kassa confirmed+paid mét tafel — niet dubbel op keuken. */
    it('hides paid POS DINE_IN in confirmed when table_number set (final receipt row)', () => {
      expect(
        isKitchenQueueOrder({
          status: 'confirmed',
          order_type: 'DINE_IN',
          payment_status: 'paid',
          items: itemsOne,
          table_number: '5',
        }),
      ).toBe(false)
    })

    it('shows paid POS DINE_IN counter sale without table (direct ter plaatse verkoop)', () => {
      expect(
        isKitchenQueueOrder({
          status: 'confirmed',
          order_type: 'DINE_IN',
          payment_status: 'paid',
          items: itemsOne,
          table_number: null,
        }),
      ).toBe(true)
    })

    it('hides unpaid DINE_IN while preparing (kitchen tapped Klaar, bill open)', () => {
      expect(
        isKitchenQueueOrder({
          status: 'preparing',
          order_type: 'DINE_IN',
          payment_status: 'pending',
          items: itemsOne,
        }),
      ).toBe(false)
    })

    it('shows webshop confirmed preparing (kitchen must cook)', () => {
      expect(
        isKitchenQueueOrder({
          status: 'preparing',
          order_type: 'pickup',
          payment_status: 'pending',
          items: itemsOne,
        }),
      ).toBe(true)
    })

    it('shows POS takeaway confirmed paid (bon voor afhaal-keuken)', () => {
      expect(
        isKitchenQueueOrder({
          status: 'confirmed',
          order_type: 'TAKEAWAY',
          payment_status: 'paid',
          items: itemsOne,
        }),
      ).toBe(true)
    })
  })
})

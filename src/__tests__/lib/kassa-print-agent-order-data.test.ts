import {
  buildKassaPrintAgentOrderItem,
  kassaCartHasPrintableLineAnnotations,
  kassaReceiptOmitPrintAgentOrderData,
} from '@/lib/kassa-print-agent-order-data'
import type { KassaCartItem } from '@/lib/kassa-cart-types'

function cartLine(overrides: Partial<KassaCartItem> & Pick<KassaCartItem, 'cartKey'>): KassaCartItem {
  return {
    product: {
      id: 'p1',
      tenant_slug: 'demo',
      category_id: null,
      name: 'Bedrag €1.00',
      description: '',
      price: 1,
      image_url: '',
      is_active: true,
      is_popular: false,
      sort_order: 0,
      allergens: [],
    },
    quantity: 1,
    ...overrides,
  }
}

describe('kassa-print-agent-order-data', () => {
  it('detects line annotations', () => {
    expect(kassaCartHasPrintableLineAnnotations([])).toBe(false)
    expect(
      kassaCartHasPrintableLineAnnotations([cartLine({ cartKey: 'a', lineNote: 'Ananas' })]),
    ).toBe(true)
  })

  it('omits orderData on kassa when annotations exist', () => {
    const lines = [cartLine({ cartKey: 'a', lineNote: 'Ahmed' })]
    expect(kassaReceiptOmitPrintAgentOrderData('kassa', lines)).toBe(true)
    expect(kassaReceiptOmitPrintAgentOrderData('keuken', lines)).toBe(false)
  })

  it('maps kitchen notes on order items', () => {
    const item = buildKassaPrintAgentOrderItem(
      cartLine({ cartKey: 'a', lineNote: 'Zonder ui' }),
      'keuken',
    )
    expect(item.notes).toBe('Zonder ui')
  })

  it('maps naam-heading vs instructie for kassa item payload', () => {
    const nameItem = buildKassaPrintAgentOrderItem(
      cartLine({ cartKey: 'a', lineNote: 'Rudi' }),
      'kassa',
    )
    expect(nameItem.notes).toBeUndefined()

    const instr = buildKassaPrintAgentOrderItem(
      cartLine({ cartKey: 'b', lineNote: 'Zonder boter' }),
      'kassa',
    )
    expect(instr.notes).toBe('Zonder boter')
  })
})

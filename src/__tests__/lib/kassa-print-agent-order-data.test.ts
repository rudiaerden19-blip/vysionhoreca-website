import {
  buildKassaPrintAgentOrderItem,
  buildKassaPrintAgentReceiptHeadingNames,
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
  it('kassa: alle opmerkingen op productregel in print-payload', () => {
    const lines = [
      cartLine({ cartKey: 'a', lineNote: 'Zonder ui' }),
      cartLine({ cartKey: 'b', lineNote: 'Ananas' }),
    ]
    expect(buildKassaPrintAgentOrderItem(lines[0], 'kassa').notes).toBe('Zonder ui')
    expect(buildKassaPrintAgentOrderItem(lines[1], 'kassa').notes).toBe('Ananas')
    expect(buildKassaPrintAgentReceiptHeadingNames(lines, 'kassa')).toBeUndefined()
  })

  it('keuken: alle opmerkingen op item', () => {
    const line = cartLine({ cartKey: 'a', lineNote: 'Ahmed' })
    expect(buildKassaPrintAgentOrderItem(line, 'keuken').notes).toBe('Ahmed')
    expect(buildKassaPrintAgentReceiptHeadingNames([line], 'keuken')).toBeUndefined()
  })
})

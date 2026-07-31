import { hydrateKassaCartItemsFromCatalog } from '@/lib/kassa-receipt-vat'
import type { KassaCartItem } from '@/lib/kassa-cart-types'

describe('hydrateKassaCartItemsFromCatalog', () => {
  it('zet category_id vanuit menu als tafel-snapshot die mist', () => {
    const alcoholCat = 'cat-beer'
    const line: KassaCartItem = {
      cartKey: 'k1',
      quantity: 2,
      product: {
        id: 'p-desperados',
        tenant_slug: 'demo',
        category_id: null,
        name: 'Desperados',
        description: '',
        price: 3.8,
        image_url: '',
        is_active: true,
        is_popular: false,
        sort_order: 0,
        allergens: [],
      },
    }
    const hydrated = hydrateKassaCartItemsFromCatalog([line], [
      {
        id: 'p-desperados',
        tenant_slug: 'demo',
        category_id: alcoholCat,
        name: 'Desperados',
        description: '',
        price: 3.8,
        image_url: '',
        is_active: true,
        is_popular: false,
        sort_order: 0,
        allergens: [],
      },
    ])
    expect(hydrated[0].product.category_id).toBe(alcoholCat)
  })
})

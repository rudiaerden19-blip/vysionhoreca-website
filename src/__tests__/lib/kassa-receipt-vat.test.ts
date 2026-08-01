import { hydrateKassaCartItemsFromCatalog } from '@/lib/kassa-receipt-vat'
import type { KassaCartItem } from '@/lib/kassa-cart-types'
import type { MenuCategory, MenuProduct } from '@/lib/admin-api'
import { computeKassaReceiptVatFromCartLines } from '@/lib/kassa-receipt-vat'

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

describe('computeKassaReceiptVatFromCartLines', () => {
  const foodCat: MenuCategory = {
    id: 'cat-food',
    tenant_slug: 'demo',
    name: 'Eten',
    default_btw_percentage: null,
    image_url: '',
    is_active: true,
    sort_order: 0,
  }
  const drinkCat: MenuCategory = {
    id: 'cat-drink',
    tenant_slug: 'demo',
    name: 'Drank',
    default_btw_percentage: 21,
    image_url: '',
    is_active: true,
    sort_order: 1,
  }
  const burger: MenuProduct = {
    id: 'p-burger',
    tenant_slug: 'demo',
    category_id: 'cat-food',
    name: 'Burger',
    description: '',
    price: 10,
    image_url: '',
    is_active: true,
    is_popular: false,
    sort_order: 0,
    allergens: [],
  }
  const cola: MenuProduct = {
    id: 'p-cola',
    tenant_slug: 'demo',
    category_id: 'cat-drink',
    name: 'Cola',
    description: '',
    price: 3,
    image_url: '',
    is_active: true,
    is_popular: false,
    sort_order: 0,
    allergens: [],
  }

  it('splitst 9% eten en 21% drank op één bon (NL ter plaatse)', () => {
    const lines: KassaCartItem[] = [
      {
        cartKey: '1',
        quantity: 1,
        product: { ...burger, category_id: null },
      },
      {
        cartKey: '2',
        quantity: 1,
        product: { ...cola, category_id: null },
      },
    ]
    const vat = computeKassaReceiptVatFromCartLines(
      lines,
      [foodCat, drinkCat],
      [burger, cola],
      9,
      'DINE_IN',
      'NL',
      null,
    )
    expect(vat.byRate.map((l) => l.rate).sort((a, b) => a - b)).toEqual([9, 21])
  })
})

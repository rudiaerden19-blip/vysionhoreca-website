import { computeKassaReceiptVatFromCartLines, hydrateKassaCartItemsFromCatalog } from '@/lib/kassa-receipt-vat'
import type { KassaCartItem } from '@/lib/kassa-cart-types'
import type { MenuCategory, MenuProduct } from '@/lib/admin-api'

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

describe('computeKassaReceiptVatFromCartLines BE-bon', () => {
  const foodCat: MenuCategory = {
    id: 'cat-eten',
    tenant_slug: 't',
    name: 'Ontbijt',
    description: '',
    sort_order: 0,
    is_active: true,
    default_btw_percentage: null,
  }

  function product(id: string, name: string, price: number): MenuProduct {
    return {
      id,
      tenant_slug: 't',
      category_id: 'cat-eten',
      name,
      description: '',
      price,
      image_url: '',
      is_active: true,
      is_popular: false,
      sort_order: 0,
      allergens: [],
    }
  }

  it('ter plaatse: eten 12% en Cavella 21%', () => {
    const lines: KassaCartItem[] = [
      { cartKey: '1', quantity: 1, product: product('p1', 'Ontbijthuisjeje', 14.9) },
      { cartKey: '2', quantity: 1, product: product('p2', 'Cavella', 6) },
      { cartKey: '3', quantity: 1, product: product('p3', 'Smos', 7.2) },
    ]
    const vat = computeKassaReceiptVatFromCartLines(
      lines,
      [foodCat],
      lines.map((l) => l.product),
      6,
      'DINE_IN',
      'BE',
    )
    expect(vat.byRate.map((r) => r.rate).sort((a, b) => a - b)).toEqual([12, 21])
  })

  it('meenemen: alles 6%', () => {
    const lines: KassaCartItem[] = [
      { cartKey: '1', quantity: 1, product: product('p1', 'Ontbijthuisjeje', 14.9) },
      { cartKey: '2', quantity: 1, product: product('p2', 'Cavella', 6) },
    ]
    const vat = computeKassaReceiptVatFromCartLines(
      lines,
      [foodCat],
      lines.map((l) => l.product),
      6,
      'TAKEAWAY',
      'BE',
    )
    expect(vat.byRate.map((r) => r.rate)).toEqual([6])
  })

  it('NL blijft één dranktarief 21% bij meenemen', () => {
    const drinkCat: MenuCategory = {
      ...foodCat,
      id: 'cat-drank',
      name: 'Dranken',
      default_btw_percentage: 21,
    }
    const lines: KassaCartItem[] = [
      { cartKey: '1', quantity: 1, product: { ...product('p2', 'Cola', 3), category_id: 'cat-drank' } },
    ]
    const vat = computeKassaReceiptVatFromCartLines(
      lines,
      [drinkCat],
      lines.map((l) => l.product),
      9,
      'TAKEAWAY',
      'NL',
    )
    expect(vat.byRate.map((r) => r.rate)).toEqual([21])
  })
})

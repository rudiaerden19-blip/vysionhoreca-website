import { filterRetailSkusForLiveSearch, type RetailPosSku } from '@/lib/retail-pos-catalog'

function sku(name: string): RetailPosSku {
  return {
    lineKey: name,
    productId: name,
    variantId: null,
    name,
    description: '',
    price: 1,
    image_url: '',
    article_number: null,
    barcode: null,
    size_label: null,
    color_label: null,
    track_stock: false,
    stock_quantity: 0,
    low_stock_threshold: 0,
    category_id: null,
  }
}

describe('filterRetailSkusForLiveSearch', () => {
  const catalog = [sku('Carbon'), sku('Bastos'), sku('Marlboro'), sku('Bali')]

  it('toont bij één letter alle namen met die letter, beginnend eerst', () => {
    expect(filterRetailSkusForLiveSearch(catalog, 'b').map((s) => s.name)).toEqual([
      'Bali',
      'Bastos',
      'Carbon',
      'Marlboro',
    ])
  })

  it('verengt de lijst als er een tweede letter bijkomt', () => {
    expect(filterRetailSkusForLiveSearch(catalog, 'ba').map((s) => s.name)).toEqual([
      'Bali',
      'Bastos',
    ])
  })

  it('geeft niets terug op een lege zoekterm', () => {
    expect(filterRetailSkusForLiveSearch(catalog, '  ')).toEqual([])
  })
})

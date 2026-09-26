import { planRetailSaleStockWrites, type RetailPosSku } from '@/lib/retail-pos-catalog'

function sku(partial: Pick<RetailPosSku, 'lineKey' | 'stock_quantity' | 'track_stock'>): RetailPosSku {
  return {
    lineKey: partial.lineKey,
    productId: partial.lineKey,
    variantId: null,
    name: partial.lineKey,
    description: '',
    price: 10,
    image_url: '',
    article_number: null,
    barcode: null,
    size_label: null,
    color_label: null,
    track_stock: partial.track_stock,
    stock_quantity: partial.stock_quantity,
    low_stock_threshold: 0,
    category_id: null,
  }
}

describe('planRetailSaleStockWrites', () => {
  it('laat artikelen zonder voorraad met rust', () => {
    const catalog = [sku({ lineKey: 'a', stock_quantity: 4, track_stock: false })]
    const planned = planRetailSaleStockWrites(catalog, [{ sku: catalog[0], quantity: 2 }])
    expect(planned.writes).toEqual([])
    expect(planned.catalog).toBe(catalog)
  })

  it('zet de lokale stand meteen omlaag en bewaart het absolute aantal om weg te schrijven', () => {
    const catalog = [sku({ lineKey: 'a', stock_quantity: 5, track_stock: true })]
    const planned = planRetailSaleStockWrites(catalog, [{ sku: catalog[0], quantity: 2 }])
    expect(planned.writes.map((w) => w.nextQty)).toEqual([3])
    expect(planned.catalog[0].stock_quantity).toBe(3)
    expect(catalog[0].stock_quantity).toBe(5)
  })

  it('trekt twee regels van hetzelfde artikel na elkaar af', () => {
    const catalog = [sku({ lineKey: 'a', stock_quantity: 5, track_stock: true })]
    const line = { sku: catalog[0], quantity: 2 }
    const planned = planRetailSaleStockWrites(catalog, [line, { sku: catalog[0], quantity: 1 }])
    expect(planned.writes.map((w) => w.nextQty)).toEqual([3, 2])
    expect(planned.catalog[0].stock_quantity).toBe(2)
  })

  it('gaat niet onder nul', () => {
    const catalog = [sku({ lineKey: 'a', stock_quantity: 1, track_stock: true })]
    const planned = planRetailSaleStockWrites(catalog, [{ sku: catalog[0], quantity: 4 }])
    expect(planned.writes[0].nextQty).toBe(0)
  })
})

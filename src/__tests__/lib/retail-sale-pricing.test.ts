import { priceRetailSale } from '@/lib/retail-sale-pricing'
import { orderItemLineTotalEur } from '@/lib/order-items-display'
import { allocateVatBucketsForSingleOrder } from '@/lib/order-vat'

describe('priceRetailSale', () => {
  it('splitst 6% en 21% op het bedrag dat betaald wordt', () => {
    const priced = priceRetailSale([
      { key: 'a', payableAfterPromo: 10.6, vatRate: 6 },
      { key: 'b', payableAfterPromo: 12.1, vatRate: 21 },
    ])
    expect(priced.total).toBe(22.7)
    expect(priced.vatSplit).toEqual([
      { rate: 6, baseExcl: 10, tax: 0.6 },
      { rate: 21, baseExcl: 10, tax: 2.1 },
    ])
    expect(priced.totalTax).toBe(2.7)
  })

  it('haalt een procent van één artikel af voor de btw', () => {
    const priced = priceRetailSale([
      {
        key: 'a',
        payableAfterPromo: 10,
        vatRate: 21,
        lineDiscount: { kind: 'percent', value: 10 },
      },
    ])
    expect(priced.lines[0].payable).toBe(9)
    expect(priced.lines[0].tax).toBe(1.56)
    expect(priced.total).toBe(9)
  })

  it('verdeelt een bonkorting over de tarieven', () => {
    const priced = priceRetailSale(
      [
        { key: 'a', payableAfterPromo: 10, vatRate: 6 },
        { key: 'b', payableAfterPromo: 10, vatRate: 21 },
      ],
      { ticketDiscount: { kind: 'amount', value: 4 } },
    )
    expect(priced.total).toBe(16)
    expect(priced.lines.map((l) => l.payable)).toEqual([8, 8])
    const buckets = allocateVatBucketsForSingleOrder(
      {
        total: priced.total,
        order_type: 'TAKEAWAY',
        items: priced.lines.map((l) => ({
          line_total: l.payable,
          price: 99,
          quantity: 1,
          btw_percentage: l.vatRate,
        })),
      },
      21,
    )
    expect(buckets.buckets[6]).toBe(priced.vatSplit.find((r) => r.rate === 6)?.tax)
    expect(buckets.buckets[21]).toBe(priced.vatSplit.find((r) => r.rate === 21)?.tax)
  })
})

describe('orderItemLineTotalEur retail', () => {
  it('gebruikt line_total zodat een gratis stuk geen btw meer telt', () => {
    expect(orderItemLineTotalEur({ price: 10, quantity: 3, line_total: 20 })).toBe(20)
    expect(orderItemLineTotalEur({ price: 10, quantity: 1, line_total: 0 })).toBe(0)
  })
})

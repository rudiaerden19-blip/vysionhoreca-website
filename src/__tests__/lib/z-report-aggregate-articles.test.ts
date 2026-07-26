import { aggregateZReportArticleLines } from '@/lib/z-report-aggregate-articles'
import { buildZReportVatContext } from '@/lib/z-report-vat-context'

describe('aggregateZReportArticleLines', () => {
  it('gebruikt total_price i.p.v. unit_price × quantity (voorkomt 99 → 396)', () => {
    const lines = aggregateZReportArticleLines([
      {
        items: [
          {
            product_name: 'Dagschotel',
            quantity: 4,
            unit_price: 99,
            total_price: 99,
          },
        ],
      },
    ], 6)

    expect(lines).toHaveLength(1)
    expect(lines[0].total).toBe(99)
    expect(lines[0].qty).toBe(4)
    expect(lines[0].vatRate).toBe(6)
  })

  it('berekent kassa-regels met basisprijs + opties × aantal', () => {
    const lines = aggregateZReportArticleLines([
      {
        items: [
          {
            name: 'Frieten',
            price: 4.5,
            quantity: 2,
            options: [{ name: 'Mayo', price: 0.5 }],
          },
        ],
      },
    ])

    expect(lines[0].label).toBe('Frieten (Mayo)')
    expect(lines[0].total).toBe(10)
    expect(lines[0].qty).toBe(2)
  })

  it('ondersteunt geneste product-shape uit de kassa', () => {
    const lines = aggregateZReportArticleLines([
      {
        items: [
          {
            product: { name: 'Cola', price: 2.5 },
            quantity: 3,
          },
        ],
      },
    ])

    expect(lines[0].label).toBe('Cola')
    expect(lines[0].total).toBe(7.5)
    expect(lines[0].qty).toBe(3)
  })

  it('agregeert meerdere orders met dezelfde artikelregel', () => {
    const item = { name: 'Koffie', price: 2.5, quantity: 1 }
    const lines = aggregateZReportArticleLines([{ items: [item] }, { items: [item] }], 6)

    expect(lines).toHaveLength(1)
    expect(lines[0].qty).toBe(2)
    expect(lines[0].total).toBe(5)
    expect(lines[0].vatRate).toBe(6)
  })

  it('splitst dezelfde artikel bij verschillend BTW-tarief', () => {
    const ctx = buildZReportVatContext(
      [
        { id: 'food', default_btw_percentage: null },
        { id: 'drink', default_btw_percentage: 21 },
      ],
      [
        { id: 'p1', name: 'Frieten', category_id: 'food' },
        { id: 'p2', name: 'Cola', category_id: 'drink' },
      ],
    )
    const lines = aggregateZReportArticleLines(
      [
        {
          order_type: 'DINE_IN',
          items: [{ name: 'Frieten', price: 6, quantity: 1, product_id: 'p1' }],
        },
        {
          order_type: 'TAKEAWAY',
          items: [{ name: 'Frieten', price: 6, quantity: 1, product_id: 'p1' }],
        },
        {
          order_type: 'TAKEAWAY',
          items: [{ name: 'Cola', price: 2.5, quantity: 1, product_id: 'p2' }],
        },
      ],
      6,
      ctx,
    )
    const frietLines = lines.filter((l) => l.label === 'Frieten')
    expect(frietLines).toHaveLength(2)
    expect(frietLines.map((l) => l.vatRate).sort((a, b) => a - b)).toEqual([6, 12])
    const cola = lines.find((l) => l.label === 'Cola')
    expect(cola?.vatRate).toBe(21)
  })
})

import { aggregateZReportArticleLines } from '@/lib/z-report-aggregate-articles'

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
    ])

    expect(lines).toHaveLength(1)
    expect(lines[0].total).toBe(99)
    expect(lines[0].qty).toBe(4)
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
    const lines = aggregateZReportArticleLines([{ items: [item] }, { items: [item] }])

    expect(lines).toHaveLength(1)
    expect(lines[0].qty).toBe(2)
    expect(lines[0].total).toBe(5)
  })
})

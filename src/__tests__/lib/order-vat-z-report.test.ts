import { aggregateZReportVatFromOrderRows } from '@/lib/order-vat'
import { buildZReportVatContext as buildCtx } from '@/lib/z-report-vat-context'

describe('aggregateZReportVatFromOrderRows', () => {
  const foodCatId = 'cat-food'
  const drinkCatId = 'cat-drink'

  const ctx = buildCtx(
    [
      { id: foodCatId, default_btw_percentage: 6 },
      { id: drinkCatId, default_btw_percentage: 21 },
    ],
    [
      { id: 'p-friet', name: 'Middelfriet', category_id: foodCatId },
      { id: 'p-fanta', name: 'Fanta', category_id: drinkCatId },
      { id: 'p-jupiler', name: 'Jupiler', category_id: drinkCatId },
    ],
  )

  it('splitst eten (6%) en drank (21%) ook als bon btw_percentage=6 op elke regel heeft', () => {
    const orders = [
      {
        total: 10.9,
        order_type: 'DINE_IN',
        items: [
          { name: 'Middelfriet', quantity: 1, price: 6, btw_percentage: 6, product_id: 'p-friet' },
          { name: 'Fanta', quantity: 1, price: 2.4, btw_percentage: 6, product_id: 'p-fanta' },
          { name: 'Jupiler', quantity: 1, price: 2.5, btw_percentage: 6, product_id: 'p-jupiler' },
        ],
      },
    ]

    const agg = aggregateZReportVatFromOrderRows(orders, 6, ctx)

    expect(agg.taxByRate[12]).toBeGreaterThan(0)
    expect(agg.taxByRate[21]).toBeGreaterThan(0)
    expect(agg.tax_mid).toBe(agg.taxByRate[12])
    expect(agg.tax_high).toBe(agg.taxByRate[21])
    expect(Math.round((agg.subtotalExcl + agg.totalTax) * 100) / 100).toBe(10.9)
  })

  it('eten ter plaatse 12% vs afhalen 6% in Z-rapport', () => {
    const dineIn = aggregateZReportVatFromOrderRows(
      [
        {
          total: 6,
          order_type: 'DINE_IN',
          items: [{ name: 'Middelfriet', quantity: 1, price: 6, product_id: 'p-friet' }],
        },
      ],
      6,
      ctx,
    )
    const takeaway = aggregateZReportVatFromOrderRows(
      [
        {
          total: 6,
          order_type: 'TAKEAWAY',
          items: [{ name: 'Middelfriet', quantity: 1, price: 6, product_id: 'p-friet' }],
        },
      ],
      6,
      ctx,
    )
    expect(dineIn.taxByRate[12]).toBeGreaterThan(0)
    expect(takeaway.taxByRate[6]).toBeGreaterThan(0)
    expect(dineIn.taxByRate[6] || 0).toBe(0)
    expect(takeaway.taxByRate[12] || 0).toBe(0)
  })

  it('matcht legacy regels zonder product_id op productnaam', () => {
    const orders = [
      {
        total: 4.9,
        order_type: 'TAKEAWAY',
        items: [
          { name: 'Fanta', quantity: 1, price: 2.4, btw_percentage: 6 },
          { name: 'Jupiler', quantity: 1, price: 2.5, btw_percentage: 6 },
        ],
      },
    ]

    const agg = aggregateZReportVatFromOrderRows(orders, 6, ctx)

    expect(agg.taxByRate[21]).toBeGreaterThan(0)
    expect(agg.taxByRate[6]).toBe(0)
  })
})

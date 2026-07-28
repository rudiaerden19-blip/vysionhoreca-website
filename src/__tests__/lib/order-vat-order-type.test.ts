import {
  buildProductCategoryLookup,
  dineInAndOffPremiseVatRates,
  resolveVatPercentForCategoryAndOrderType,
  resolveVatPercentForProductAndOrderType,
} from '@/lib/order-vat'

describe('order type VAT (ter plaatse / afhalen / leveren)', () => {
  const foodCat = 'cat-food'
  const drinkCat = 'cat-drink'
  const categoryById = new Map<string, number | null | undefined>([
    [foodCat, null],
    [drinkCat, 21],
  ])

  it('België: ter plaatse 12%, afhalen/levering 6% voor eten', () => {
    expect(dineInAndOffPremiseVatRates(6)).toEqual({ dineIn: 12, offPremise: 6 })
    expect(resolveVatPercentForCategoryAndOrderType(null, 6, 'DINE_IN')).toBe(12)
    expect(resolveVatPercentForCategoryAndOrderType(null, 6, 'TAKEAWAY')).toBe(6)
    expect(resolveVatPercentForCategoryAndOrderType(null, 6, 'DELIVERY')).toBe(6)
  })

  it('drank blijft 21% ongeacht besteltype', () => {
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: drinkCat },
        categoryById,
        6,
        'DINE_IN',
      ),
    ).toBe(21)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: drinkCat },
        categoryById,
        6,
        'TAKEAWAY',
      ),
    ).toBe(21)
  })

  it('eten volgt besteltype', () => {
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat },
        categoryById,
        6,
        'DINE_IN',
      ),
    ).toBe(12)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat },
        categoryById,
        6,
        'TAKEAWAY',
      ),
    ).toBe(6)
  })

  it('Nederland (zaak 9%): beide 9%', () => {
    expect(dineInAndOffPremiseVatRates(9)).toEqual({ dineIn: 9, offPremise: 9 })
  })

  it('categorie met vast 9% blijft 9% (niet order-type split)', () => {
    const cat9 = 'cat-nine'
    const map = new Map<string, number | null | undefined>([[cat9, 9]])
    expect(resolveVatPercentForCategoryAndOrderType(9, 6, 'DINE_IN')).toBe(9)
    expect(
      resolveVatPercentForProductAndOrderType(
        { id: 'p1', category_id: cat9 },
        map,
        6,
        'DINE_IN',
      ),
    ).toBe(9)
  })

  it('product_id lookup als category_id op mandregel leeg is', () => {
    const alcoholCat = 'cat-alcohol'
    const categoryById = new Map<string, number | null | undefined>([[alcoholCat, 21]])
    const productCategoryById = buildProductCategoryLookup([
      { id: 'p-beer', category_id: alcoholCat },
    ])
    expect(
      resolveVatPercentForProductAndOrderType(
        { id: 'p-beer', category_id: null },
        categoryById,
        9,
        'DINE_IN',
        productCategoryById,
      ),
    ).toBe(21)
  })
})

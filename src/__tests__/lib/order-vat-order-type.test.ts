import {
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
})

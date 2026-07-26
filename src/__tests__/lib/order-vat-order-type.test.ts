import {
  dineInAndOffPremiseVatRates,
  resolveTenantCountryForVat,
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
    expect(dineInAndOffPremiseVatRates(6, 'BE')).toEqual({ dineIn: 12, offPremise: 6 })
    expect(resolveVatPercentForCategoryAndOrderType(null, 6, 'DINE_IN', 'BE')).toBe(12)
    expect(resolveVatPercentForCategoryAndOrderType(null, 6, 'TAKEAWAY', 'BE')).toBe(6)
    expect(resolveVatPercentForCategoryAndOrderType(null, 6, 'DELIVERY', 'BE')).toBe(6)
  })

  it('drank blijft 21% ongeacht besteltype (BE)', () => {
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: drinkCat },
        categoryById,
        6,
        'DINE_IN',
        'BE',
      ),
    ).toBe(21)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: drinkCat },
        categoryById,
        6,
        'TAKEAWAY',
        'BE',
      ),
    ).toBe(21)
  })

  it('eten volgt besteltype (BE)', () => {
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat },
        categoryById,
        6,
        'DINE_IN',
        'BE',
      ),
    ).toBe(12)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat },
        categoryById,
        6,
        'TAKEAWAY',
        'BE',
      ),
    ).toBe(6)
  })

  it('Nederland: geen verschil ter plaatse vs afhalen/meenemen (zaak 9%)', () => {
    expect(dineInAndOffPremiseVatRates(9, 'NL')).toEqual({ dineIn: 9, offPremise: 9 })
    expect(resolveVatPercentForCategoryAndOrderType(null, 9, 'DINE_IN', 'NL')).toBe(9)
    expect(resolveVatPercentForCategoryAndOrderType(null, 9, 'TAKEAWAY', 'NL')).toBe(9)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat },
        categoryById,
        9,
        'DINE_IN',
        'NL',
      ),
    ).toBe(9)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat },
        categoryById,
        9,
        'TAKEAWAY',
        'NL',
      ),
    ).toBe(9)
  })

  it('Nederland: geen 12/6-split bij 6% default (Blonkys-achtige NL-zaken)', () => {
    expect(dineInAndOffPremiseVatRates(6, 'NL')).toEqual({ dineIn: 6, offPremise: 6 })
    expect(resolveVatPercentForCategoryAndOrderType(null, 6, 'DINE_IN', 'NL')).toBe(6)
    expect(resolveVatPercentForCategoryAndOrderType(null, 6, 'TAKEAWAY', 'NL')).toBe(6)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat },
        categoryById,
        6,
        'DINE_IN',
        'NL',
      ),
    ).toBe(6)
  })

  it('NL afleiden uit BTW-nummer als country leeg is', () => {
    expect(resolveVatPercentForCategoryAndOrderType(null, 6, 'DINE_IN', 'NL')).toBe(6)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat },
        categoryById,
        6,
        'DINE_IN',
        resolveTenantCountryForVat(null, 'NL123456789B01'),
      ),
    ).toBe(6)
  })
})

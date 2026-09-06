import {
  buildProductCategoryLookup,
  dineInAndOffPremiseVatRates,
  resolveTenantCountryForVat,
  resolveVatPercentForCartLine,
  resolveVatPercentForCategoryAndOrderType,
  resolveVatPercentForProductAndOrderType,
  vatServiceModeFromLabels,
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
        undefined,
        'BE',
      ),
    ).toBe(21)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: drinkCat },
        categoryById,
        6,
        'TAKEAWAY',
        undefined,
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
        undefined,
        'BE',
      ),
    ).toBe(12)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat },
        categoryById,
        6,
        'TAKEAWAY',
        undefined,
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
        undefined,
        'NL',
      ),
    ).toBe(9)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat },
        categoryById,
        9,
        'TAKEAWAY',
        undefined,
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
        undefined,
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
        undefined,
        resolveTenantCountryForVat(null, 'NL123456789B01'),
      ),
    ).toBe(6)
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

  it('optie Meenemen → 6% ook als kassa op ter plaatse staat (BE)', () => {
    expect(vatServiceModeFromLabels(['Meenemen'])).toBe('TAKEAWAY')
    expect(vatServiceModeFromLabels(['Ter plaatse'])).toBe('DINE_IN')
    expect(vatServiceModeFromLabels(['mayo'])).toBeNull()
    expect(
      resolveVatPercentForCartLine(
        { category_id: foodCat },
        categoryById,
        6,
        'DINE_IN',
        undefined,
        'BE',
        [{ choiceName: 'Meenemen' }],
      ),
    ).toBe(6)
    expect(
      resolveVatPercentForCartLine(
        { category_id: foodCat },
        categoryById,
        6,
        'TAKEAWAY',
        undefined,
        'BE',
        [{ choiceName: 'Ter plaatse' }],
      ),
    ).toBe(12)
  })

  it('optie Meenemen laat drank 21% ongemoeid', () => {
    expect(
      resolveVatPercentForCartLine(
        { category_id: drinkCat },
        categoryById,
        6,
        'DINE_IN',
        undefined,
        'BE',
        [{ choiceName: 'Meenemen' }],
      ),
    ).toBe(21)
  })

  it('zonder Meenemen/Ter plaatse-optie blijft besteltype gelden', () => {
    expect(
      resolveVatPercentForCartLine(
        { category_id: foodCat },
        categoryById,
        6,
        'DINE_IN',
        undefined,
        'BE',
        [{ choiceName: 'Mayonaise' }],
      ),
    ).toBe(12)
  })
})

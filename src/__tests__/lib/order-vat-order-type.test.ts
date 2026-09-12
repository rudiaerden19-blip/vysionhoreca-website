import {
  buildCategoryVatLookupForJurisdiction,
  buildProductCategoryLookup,
  computeInclusiveVatSplitFromCart,
  dineInAndOffPremiseVatRates,
  inferVatJurisdictionCountry,
  looksLikeBelgiumDrinkCategory,
  looksLikeBelgiumDrinkName,
  resolveTenantCountryForVat,
  resolveVatPercentForCartLine,
  resolveVatPercentForCategoryAndOrderType,
  resolveVatPercentForProductAndOrderType,
  shouldUnifyDineInAndOffPremiseVat,
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

  it('BE-bon: drank ter plaatse 21%, meenemen 6%', () => {
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
    ).toBe(6)
  })

  it('BE-bon: Cavella/koffie op naam zijn drank (21% ter plaatse, 6% meenemen)', () => {
    expect(looksLikeBelgiumDrinkName('Cavella')).toBe(true)
    expect(looksLikeBelgiumDrinkName('Koffie verkeerd')).toBe(true)
    expect(looksLikeBelgiumDrinkName('Smos')).toBe(false)
    expect(looksLikeBelgiumDrinkName('Ontbijthuisjeje')).toBe(false)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat, name: 'Cavella' },
        categoryById,
        6,
        'DINE_IN',
        undefined,
        'BE',
      ),
    ).toBe(21)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat, name: 'Cavella' },
        categoryById,
        6,
        'TAKEAWAY',
        undefined,
        'BE',
      ),
    ).toBe(6)
  })

  it('BE-bon: categorie Dranken zonder 21%-override is toch drank', () => {
    expect(looksLikeBelgiumDrinkCategory('Dranken')).toBe(true)
    expect(looksLikeBelgiumDrinkCategory('Ontbijt')).toBe(false)
    const drinkNamed = 'cat-dranken-naam'
    const lookup = buildCategoryVatLookupForJurisdiction(
      [
        { id: foodCat, name: 'Ontbijt', default_btw_percentage: null },
        { id: drinkNamed, name: 'Dranken', default_btw_percentage: null },
      ],
      'BE',
    )
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: drinkNamed, name: 'Huislimonade' },
        lookup,
        6,
        'DINE_IN',
        undefined,
        'BE',
      ),
    ).toBe(21)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: drinkNamed, name: 'Huislimonade' },
        lookup,
        6,
        'TAKEAWAY',
        undefined,
        'BE',
      ),
    ).toBe(6)
    const nlLookup = buildCategoryVatLookupForJurisdiction(
      [{ id: drinkNamed, name: 'Dranken', default_btw_percentage: null }],
      'NL',
    )
    expect(nlLookup.get(drinkNamed)).toBeNull()
  })

  it('BE-bon ter plaatse: eten 12% en Cavella 21% op dezelfde ticket', () => {
    const split = computeInclusiveVatSplitFromCart(
      [
        {
          cartKey: '1',
          quantity: 1,
          product: {
            id: 'p-ontbijt',
            tenant_slug: 't',
            category_id: foodCat,
            name: 'Ontbijthuisjeje',
            description: '',
            price: 14.9,
            image_url: '',
            is_active: true,
            is_popular: false,
            sort_order: 0,
            allergens: [],
          },
        },
        {
          cartKey: '2',
          quantity: 1,
          product: {
            id: 'p-cavella',
            tenant_slug: 't',
            category_id: foodCat,
            name: 'Cavella',
            description: '',
            price: 6,
            image_url: '',
            is_active: true,
            is_popular: false,
            sort_order: 0,
            allergens: [],
          },
        },
        {
          cartKey: '3',
          quantity: 1,
          product: {
            id: 'p-smos',
            tenant_slug: 't',
            category_id: foodCat,
            name: 'Smos',
            description: '',
            price: 7.2,
            image_url: '',
            is_active: true,
            is_popular: false,
            sort_order: 0,
            allergens: [],
          },
        },
      ],
      (line) =>
        resolveVatPercentForProductAndOrderType(
          line.product,
          categoryById,
          6,
          'DINE_IN',
          undefined,
          'BE',
        ),
    )
    expect(split.grossTotal).toBe(28.1)
    expect(split.byRate.map((r) => r.rate).sort((a, b) => a - b)).toEqual([12, 21])
    expect(split.byRate.find((r) => r.rate === 12)?.baseExcl).toBeCloseTo(19.73, 1)
    expect(split.byRate.find((r) => r.rate === 21)?.tax).toBeCloseTo(1.04, 1)
  })

  it('BE-bon: cava zonder 21%-categorie ter plaatse toch 21%', () => {
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat, name: 'Cava' },
        categoryById,
        6,
        'DINE_IN',
        undefined,
        'BE',
      ),
    ).toBe(21)
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: foodCat, name: 'Cava' },
        categoryById,
        6,
        'TAKEAWAY',
        undefined,
        'BE',
      ),
    ).toBe(6)
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

  it('BE-btw wint van fout land NL in instellingen', () => {
    expect(resolveTenantCountryForVat('NL', 'BE1001.849.652')).toBe('BE')
    expect(resolveTenantCountryForVat('BE', 'NL123456789B01')).toBe('NL')
    expect(resolveTenantCountryForVat('België', null)).toBe('BE')
    expect(resolveTenantCountryForVat('Belgique', null)).toBe('BE')
  })

  it('elke BE-zaak zonder land: 6/12-default → BE, 9% of NL-btw blijft NL', () => {
    expect(inferVatJurisdictionCountry(null, null, 6)).toBe('BE')
    expect(inferVatJurisdictionCountry(null, null, 12)).toBe('BE')
    expect(inferVatJurisdictionCountry(null, null, 9)).toBe('NL')
    expect(inferVatJurisdictionCountry(null, 'NL123456789B01', 6)).toBe('NL')
    expect(inferVatJurisdictionCountry('België', null, 9)).toBe('BE')
    expect(shouldUnifyDineInAndOffPremiseVat(9, 'BE')).toBe(false)
    expect(shouldUnifyDineInAndOffPremiseVat(9, 'NL')).toBe(true)
  })

  it('Ter plaatse met spatie is 12%', () => {
    expect(vatServiceModeFromLabels(['Ter plaatse '])).toBe('DINE_IN')
    expect(
      resolveVatPercentForCartLine(
        { category_id: foodCat },
        categoryById,
        6,
        'DINE_IN',
        undefined,
        'BE',
        [{ choiceName: 'Ter plaatse ' }],
      ),
    ).toBe(12)
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

  it('optie Meenemen zet BE-drank op 6%', () => {
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
    ).toBe(6)
  })

  it('NL (Blonkys e.d.): drank blijft 21% bij meenemen', () => {
    expect(
      resolveVatPercentForProductAndOrderType(
        { category_id: drinkCat },
        categoryById,
        9,
        'TAKEAWAY',
        undefined,
        'NL',
      ),
    ).toBe(21)
    expect(
      resolveVatPercentForCartLine(
        { category_id: drinkCat },
        categoryById,
        9,
        'DINE_IN',
        undefined,
        'NL',
        [{ choiceName: 'Meenemen' }],
      ),
    ).toBe(21)
  })

  it('optie Ter plaatse is altijd 12%, ook als zaak-default 6% is', () => {
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
  })

  it('NL-zaak: optie Ter plaatse wijzigt het tarief niet', () => {
    expect(
      resolveVatPercentForCartLine(
        { category_id: foodCat },
        categoryById,
        9,
        'TAKEAWAY',
        undefined,
        'NL',
        [{ choiceName: 'Ter plaatse' }],
      ),
    ).toBe(9)
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

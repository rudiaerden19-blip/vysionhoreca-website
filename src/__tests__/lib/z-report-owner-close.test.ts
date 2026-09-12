import {
  applyOwnerCloseToDayTotals,
  hasOwnerCloseValues,
  ownerCloseOrderTypeTotals,
  ownerClosePaymentRow,
  ownerCloseToAmounts,
  shouldKeepOwnerEveningCloseTotals,
  splitInclVat,
  zReportOwnerEveningCloseEnabled,
} from '@/lib/z-report-owner-close'

describe('zReportOwnerEveningCloseEnabled', () => {
  it('is standaard uit (andere tenants)', () => {
    expect(zReportOwnerEveningCloseEnabled(undefined)).toBe(false)
    expect(zReportOwnerEveningCloseEnabled(null)).toBe(false)
    expect(zReportOwnerEveningCloseEnabled(false)).toBe(false)
  })

  it('zet aan bij expliciet ja', () => {
    expect(zReportOwnerEveningCloseEnabled(true)).toBe(true)
  })
})

describe('ownerCloseToAmounts', () => {
  it('splitst meenemen 6%, ter plaatse eten 12% en drank 21%', () => {
    expect(splitInclVat(106, 6)).toEqual({ baseExcl: 100, tax: 6 })
    expect(splitInclVat(112, 12)).toEqual({ baseExcl: 100, tax: 12 })
    expect(splitInclVat(121, 21)).toEqual({ baseExcl: 100, tax: 21 })
  })

  it('zet cash en Bancontact als dagtotaal met 12% en 21%', () => {
    const a = ownerCloseToAmounts({
      cash: 213,
      card: 87,
      takeawayIncl: 106,
      dineInIncl: 112,
      dineInDrinksIncl: 121,
    })
    expect(a.cashPayments).toBe(213)
    expect(a.cardPayments).toBe(87)
    expect(a.totalIncl).toBe(300)
    expect(a.taxByRate[6]).toBe(6)
    expect(a.taxByRate[12]).toBe(12)
    expect(a.taxByRate[21]).toBe(21)
    expect(
      hasOwnerCloseValues({
        cash: 213,
        card: 0,
        takeawayIncl: 0,
        dineInIncl: 0,
        dineInDrinksIncl: 0,
      }),
    ).toBe(true)
  })
})

describe('shouldKeepOwnerEveningCloseTotals', () => {
  it('blijft uit voor andere tenants', () => {
    expect(
      shouldKeepOwnerEveningCloseTotals(false, {
        owner_cash: 210,
        owner_card: 350,
        owner_takeaway_incl: 500,
        owner_dinein_incl: 60,
        owner_dinein_drinks_incl: 40,
      }),
    ).toBe(false)
  })

  it('bewaart ingevulde avondtelling als de module aan staat', () => {
    expect(
      shouldKeepOwnerEveningCloseTotals(true, {
        owner_cash: 210,
        owner_card: 350,
        owner_takeaway_incl: 500,
        owner_dinein_incl: 60,
        owner_dinein_drinks_incl: 40,
      }),
    ).toBe(true)
  })
})

describe('applyOwnerCloseToDayTotals', () => {
  it('zet een leeg kassa-totaal niet terug op 0', () => {
    const next = applyOwnerCloseToDayTotals(
      {
        orderCount: 0,
        subtotal: 0,
        total: 0,
        cashPayments: 0,
        cardPayments: 0,
        onlinePayments: 0,
      },
      { cash: 210, card: 350, takeawayIncl: 500, dineInIncl: 60, dineInDrinksIncl: 0 },
    )
    expect(next.total).toBe(560)
    expect(next.cashPayments).toBe(210)
    expect(next.cardPayments).toBe(350)
    expect(next.orderCount).toBe(1)
  })
})

describe('ownerClosePaymentRow / order types', () => {
  const input = {
    cash: 90,
    card: 60,
    takeawayIncl: 100,
    dineInIncl: 50,
    dineInDrinksIncl: 30,
  }

  it('zet dagtelling op cash + Bancontact', () => {
    expect(ownerClosePaymentRow(input)).toEqual({
      receipts: 1,
      cash: 90,
      card: 60,
      total: 150,
    })
  })

  it('zet ter plaatse op eten + drank', () => {
    expect(ownerCloseOrderTypeTotals(input)).toEqual({
      DINE_IN: 80,
      TAKEAWAY: 100,
      DELIVERY: 0,
    })
  })
})

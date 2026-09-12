import {
  applyOwnerCloseToDayTotals,
  hasOwnerCloseValues,
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
  it('splitst meenemen 6% en daar eten 21%', () => {
    expect(splitInclVat(106, 6)).toEqual({ baseExcl: 100, tax: 6 })
    expect(splitInclVat(121, 21)).toEqual({ baseExcl: 100, tax: 21 })
  })

  it('zet cash en Bancontact als dagtotaal', () => {
    const a = ownerCloseToAmounts({
      cash: 213,
      card: 87,
      takeawayIncl: 140,
      dineInIncl: 160,
    })
    expect(a.cashPayments).toBe(213)
    expect(a.cardPayments).toBe(87)
    expect(a.totalIncl).toBe(300)
    expect(a.taxByRate[6]).toBeGreaterThan(0)
    expect(a.taxByRate[21]).toBeGreaterThan(0)
    expect(hasOwnerCloseValues({ cash: 213, card: 0, takeawayIncl: 0, dineInIncl: 0 })).toBe(true)
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
      { cash: 210, card: 350, takeawayIncl: 500, dineInIncl: 60 },
    )
    expect(next.total).toBe(560)
    expect(next.cashPayments).toBe(210)
    expect(next.cardPayments).toBe(350)
    expect(next.orderCount).toBe(1)
  })
})

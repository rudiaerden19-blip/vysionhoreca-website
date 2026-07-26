import { buildZReportEmailHtml, parseZReportEmailAmounts } from '@/lib/z-report-email-html'

const baseLabels = {
  revenue: 'OMZET',
  orderCount: 'Aantal bestellingen',
  subtotal: 'Subtotaal (excl. BTW)',
  vatTableTitle: 'BTW-overzicht',
  vatRateCol: 'Tarief',
  vatBaseCol: 'Excl. BTW',
  vatTaxCol: 'BTW',
  vatTotalRow: 'Totaal',
  total: 'TOTAAL',
  payments: 'Betaalmethodes',
  cash: 'Contant',
  card: 'Kaart/PIN',
  online: 'Online betaald',
  footerAuto: 'Automatisch rapport',
  footerGenerated: 'Gegenereerd op:',
  footerPowered: 'Vysion',
}

function sampleAmounts() {
  return {
    orderCount: 12,
    subtotalExcl: 94.34,
    totalIncl: 108.4,
    taxByRate: { 6: 5.66, 9: 0, 12: 0, 21: 8.4 },
    baseByRate: { 6: 94.34, 9: 0, 12: 0, 21: 40 },
    cashPayments: 0,
    cardPayments: 60,
    onlinePayments: 48.4,
  }
}

describe('parseZReportEmailAmounts', () => {
  it('gebruikt per-tarief velden wanneer aanwezig', () => {
    const parsed = parseZReportEmailAmounts({
      orderCount: 5,
      subtotal: 100,
      total: 120,
      tax6: 6,
      tax21: 12,
      base6: 80,
      base21: 20,
      cashPayments: 20,
      cardPayments: 50,
      onlinePayments: 50,
    })
    expect(parsed.amounts.taxByRate[6]).toBe(6)
    expect(parsed.amounts.taxByRate[21]).toBe(12)
    expect(parsed.taxLow).toBe(6)
    expect(parsed.taxHigh).toBe(12)
  })

  it('gebruikt taxLow/taxMid/taxHigh wanneer aanwezig', () => {
    const parsed = parseZReportEmailAmounts({
      orderCount: 3,
      subtotal: 100,
      taxLow: 6,
      taxMid: 1.2,
      taxHigh: 12.8,
      total: 120,
      cashPayments: 20,
      cardPayments: 50,
      onlinePayments: 50,
    })
    expect(parsed.taxLow).toBe(6)
    expect(parsed.taxMid).toBe(1.2)
    expect(parsed.taxHigh).toBe(12.8)
    expect(parsed.amounts.subtotalExcl).toBe(100)
    expect(parsed.amounts.totalIncl).toBe(120)
    expect(parsed.amounts.cashPayments).toBe(20)
  })

  it('valt terug op legacy tax + btwPercentage', () => {
    const parsed = parseZReportEmailAmounts({
      subtotal: 94.34,
      tax: 14.06,
      btwPercentage: 6,
      total: 108.4,
    })
    expect(parsed.taxLow).toBe(14.06)
    expect(parsed.taxMid).toBe(0)
    expect(parsed.taxHigh).toBe(0)
    expect(parsed.amounts.subtotalExcl).toBe(94.34)
    expect(parsed.amounts.totalIncl).toBe(108.4)
    expect(parsed.amounts.taxByRate[6]).toBe(14.06)
  })
})

describe('buildZReportEmailHtml', () => {
  it('toont dezelfde BTW-regels als het Z-rapport scherm', () => {
    const html = buildZReportEmailHtml({
      businessName: 'Demo Frituur',
      formattedDate: 'maandag 21 juli 2026',
      amounts: sampleAmounts(),
      labels: baseLabels,
      generatedAtNl: '21-7-2026 14:00:00',
    })

    expect(html).toContain('6%')
    expect(html).toContain('€5.66')
    expect(html).toContain('21%')
    expect(html).toContain('€8.40')
    expect(html).toContain('€108.40')
  })
})

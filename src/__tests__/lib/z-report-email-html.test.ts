import { buildZReportEmailHtml, parseZReportEmailAmounts } from '@/lib/z-report-email-html'

const baseLabels = {
  revenue: 'OMZET',
  orderCount: 'Aantal bestellingen',
  subtotal: 'Subtotaal (excl. BTW)',
  vat: 'BTW',
  vatMidRates: '9% / 12%',
  total: 'TOTAAL',
  payments: 'Betaalmethodes',
  cash: 'Contant',
  card: 'Kaart/PIN',
  online: 'Online betaald',
  footerAuto: 'Automatisch rapport',
  footerGenerated: 'Gegenereerd op:',
  footerPowered: 'Vysion',
}

describe('parseZReportEmailAmounts', () => {
  it('gebruikt taxLow/taxMid/taxHigh wanneer aanwezig', () => {
    expect(
      parseZReportEmailAmounts({
        subtotal: 100,
        taxLow: 6,
        taxMid: 1.2,
        taxHigh: 12.8,
        total: 120,
        cashPayments: 20,
        cardPayments: 50,
        onlinePayments: 50,
      }),
    ).toEqual({
      subtotal: 100,
      taxLow: 6,
      taxMid: 1.2,
      taxHigh: 12.8,
      total: 120,
      cashPayments: 20,
      cardPayments: 50,
      onlinePayments: 50,
    })
  })

  it('valt terug op legacy tax + btwPercentage', () => {
    expect(
      parseZReportEmailAmounts({
        subtotal: 94.34,
        tax: 14.06,
        btwPercentage: 6,
        total: 108.4,
      }),
    ).toEqual({
      subtotal: 94.34,
      taxLow: 14.06,
      taxMid: 0,
      taxHigh: 0,
      total: 108.4,
      cashPayments: 0,
      cardPayments: 0,
      onlinePayments: 0,
    })
  })
})

describe('buildZReportEmailHtml', () => {
  it('toont dezelfde BTW-regels als het Z-rapport scherm', () => {
    const html = buildZReportEmailHtml({
      businessName: 'Demo Frituur',
      formattedDate: 'maandag 21 juli 2026',
      orderCount: 12,
      subtotal: 94.34,
      taxLow: 5.66,
      taxMid: 0,
      taxHigh: 8.4,
      total: 108.4,
      cashPayments: 0,
      cardPayments: 60,
      onlinePayments: 48.4,
      labels: baseLabels,
      generatedAtNl: '21-7-2026 14:00:00',
    })

    expect(html).toContain('BTW 6%')
    expect(html).toContain('€5.66')
    expect(html).toContain('BTW 21%')
    expect(html).toContain('€8.40')
    expect(html).not.toContain('BTW 6%:</span><span>€14.06')
    expect(html).toContain('€108.40')
  })
})

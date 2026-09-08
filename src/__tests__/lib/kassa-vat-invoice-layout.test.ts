import type { KassaCartItem } from '@/lib/kassa-cart-types'
import {
  buildKassaVatInvoiceItemRows,
  buildKassaVatInvoiceThermalLines,
  formatKassaVatInvoiceNumber,
} from '@/lib/kassa-vat-invoice-layout'

const labels = {
  title: 'FACTUUR',
  deliveryDate: 'Datum levering: {date}',
  invoiceNo: 'Factuur #',
  sellerVat: 'BTW verkoper: {vatNumber}',
  customerHeading: 'Klant',
  customerVat: 'BTW klant: {vatNumber}',
  lineAmounts: 'excl {excl}  {rate}%  btw {tax}  incl {incl}',
  totalExcl: 'Totaal excl.',
  totalVat: 'Totaal BTW',
  totalIncl: 'Totaal incl.',
  vatRateSplit: 'BTW {rate}%  excl {excl}  btw {tax}',
}

describe('kassa-vat-invoice-layout', () => {
  it('maakt een opeenvolgend factuurnummer per order', () => {
    expect(formatKassaVatInvoiceNumber(1842, new Date('2026-09-08T12:00:00'))).toBe('2026-001842')
    expect(formatKassaVatInvoiceNumber(1843, new Date('2026-09-08T12:00:00'))).toBe('2026-001843')
  })

  it('zet alle verplichte factuurvelden op de bon', () => {
    const coffee: KassaCartItem = {
      cartKey: '1',
      quantity: 2,
      product: {
        id: 'p1',
        tenant_slug: 'demo',
        category_id: 'c1',
        name: 'Koffie',
        description: '',
        price: 2.5,
        image_url: '',
        is_active: true,
        is_popular: false,
        sort_order: 0,
        allergens: [],
      },
    }
    const items = buildKassaVatInvoiceItemRows([coffee], () => 6)
    const text = buildKassaVatInvoiceThermalLines({
      labels,
      sellerName: 'Frituur De Korst',
      sellerAddress: 'Dorpsstraat 12',
      sellerPostalCity: '3500 Hasselt',
      sellerVat: 'BE 0123.456.789',
      customer: {
        name: 'Transport Janssens',
        vatNumber: 'BE 0987.654.321',
        addressLine: 'Industrieweg 4',
        postalCode: '3600',
        city: 'Genk',
      },
      invoiceNumber: '2026-001842',
      deliveryDate: '08/09/2026',
      orderMeta: 'Ter plaatse',
      items,
      rates: [{ rate: 6, baseExcl: 4.72, tax: 0.28 }],
      totalExcl: 4.72,
      totalVat: 0.28,
      totalIncl: 5,
      paidWith: 'Betaald met: BANCONTACT',
    }).join('\n')

    expect(text).toContain('Datum levering: 08/09/2026')
    expect(text).toContain('Factuur #2026-001842')
    expect(text).toContain('Frituur De Korst')
    expect(text).toContain('Dorpsstraat 12')
    expect(text).toContain('BTW verkoper: BE 0123.456.789')
    expect(text).toContain('Transport Janssens')
    expect(text).toContain('Industrieweg 4')
    expect(text).toContain('BTW klant: BE 0987.654.321')
    expect(text).toContain('2x Koffie')
    expect(text).toMatch(/excl 4\.72/)
    expect(text).toMatch(/6%/)
    expect(text).toMatch(/btw 0\.28/)
    expect(text).toContain('Totaal excl.')
    expect(text).toContain('Totaal incl.')
    expect(text).toContain('BTW 6%  excl 4.72  btw 0.28')
  })
})

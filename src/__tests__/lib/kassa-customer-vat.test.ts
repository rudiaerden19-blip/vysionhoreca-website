import {
  formatKassaCustomerVatDisplay,
  formatKassaCustomerVatReceipt,
  isKassaCustomerVatComplete,
  kassaCustomerVatMaxDigits,
  parseKassaCustomerVatInput,
} from '@/lib/kassa-customer-vat'

describe('kassa-customer-vat', () => {
  it('NL heeft meer cijfers dan BE (9+B+2 vs 10)', () => {
    expect(kassaCustomerVatMaxDigits('NL')).toBeGreaterThan(kassaCustomerVatMaxDigits('BE'))
    expect(kassaCustomerVatMaxDigits('BE')).toBe(10)
    expect(kassaCustomerVatMaxDigits('NL')).toBe(11)
  })

  it('zet BE in groepen 0123.456.789', () => {
    expect(formatKassaCustomerVatDisplay('BE', '0123456789')).toBe('0123.456.789')
    expect(formatKassaCustomerVatReceipt('BE', 'be 0123 456 789')).toBe('BE 0123.456.789')
    expect(isKassaCustomerVatComplete('BE', '0123.456.789')).toBe(true)
    expect(isKassaCustomerVatComplete('BE', '0123.456')).toBe(false)
  })

  it('zet NL in groepen 1234.56.789.B01', () => {
    expect(formatKassaCustomerVatDisplay('NL', '12345678901')).toBe('1234.56.789.B01')
    expect(formatKassaCustomerVatReceipt('NL', 'nl12345678901')).toBe('NL 1234.56.789.B01')
    expect(isKassaCustomerVatComplete('NL', '1234.56.789.B01')).toBe(true)
    expect(isKassaCustomerVatComplete('NL', '1234.56.789')).toBe(false)
  })

  it('negeert kleine letters en extra tekens bij typen', () => {
    expect(parseKassaCustomerVatInput('BE', 'be0123.456.789').receipt).toBe('BE 0123.456.789')
    expect(parseKassaCustomerVatInput('NL', 'nl 1234.56.789.b01').receipt).toBe('NL 1234.56.789.B01')
  })
})

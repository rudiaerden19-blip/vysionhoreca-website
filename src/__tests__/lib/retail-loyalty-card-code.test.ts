import {
  extractRetailLoyaltyScanCode,
  normalizeRetailLoyaltyCardCode,
} from '@/lib/retail-loyalty/card-code'

describe('extractRetailLoyaltyScanCode', () => {
  it('accepts single EAN-13 loyalty code', () => {
    const code = '8991234567890'
    expect(extractRetailLoyaltyScanCode(code)).toBe(code)
  })

  it('takes last code when scanner concatenates two scans', () => {
    const a = '8991111111115'
    const b = '8992222222220'
    expect(extractRetailLoyaltyScanCode(a + b)).toBe(b)
  })

  it('returns null for non-loyalty barcodes', () => {
    expect(extractRetailLoyaltyScanCode('5412345678901')).toBeNull()
  })
})

describe('normalizeRetailLoyaltyCardCode', () => {
  it('strips non-digits', () => {
    expect(normalizeRetailLoyaltyCardCode('899-1234-567-890')).toBe('8991234567890')
  })
})

import {
  applyKassaCheckoutVatForce,
  KASSA_CHECKOUT_ALCOHOL_VAT_PCT,
  normalizeKassaCheckoutVatMode,
} from '@/lib/kassa-checkout-vat-mode'

describe('kassa checkout vat mode', () => {
  it('standaard uit', () => {
    expect(normalizeKassaCheckoutVatMode(undefined)).toBe('off')
    expect(normalizeKassaCheckoutVatMode('')).toBe('off')
    expect(normalizeKassaCheckoutVatMode('nope')).toBe('off')
  })

  it('herkent choose / dine_in / takeaway', () => {
    expect(normalizeKassaCheckoutVatMode('choose')).toBe('choose')
    expect(normalizeKassaCheckoutVatMode('DINE_IN')).toBe('dine_in')
    expect(normalizeKassaCheckoutVatMode('takeaway')).toBe('takeaway')
  })

  it('alcohol-keuze zet de hele bon op 21%', () => {
    expect(KASSA_CHECKOUT_ALCOHOL_VAT_PCT).toBe(21)
    expect(applyKassaCheckoutVatForce(6, 21)).toBe(21)
    expect(applyKassaCheckoutVatForce(12, 21)).toBe(21)
    expect(applyKassaCheckoutVatForce(12, null)).toBe(12)
  })
})

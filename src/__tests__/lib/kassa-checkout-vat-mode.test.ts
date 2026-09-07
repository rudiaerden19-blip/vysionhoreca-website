import { normalizeKassaCheckoutVatMode } from '@/lib/kassa-checkout-vat-mode'

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
})

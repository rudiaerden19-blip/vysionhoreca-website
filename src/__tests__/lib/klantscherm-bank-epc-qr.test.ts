import { buildSepaEpcQrPayload, isPlausibleIban, normalizeIban } from '@/lib/klantscherm-bank-epc-qr'

describe('klantscherm bank EPC QR', () => {
  it('normalizes IBAN', () => {
    expect(normalizeIban('be68 5390 0754 7034')).toBe('BE68539007547034')
  })

  it('builds EPC payload with amount', () => {
    const payload = buildSepaEpcQrPayload({
      beneficiaryName: 'Demo Frituur',
      iban: 'BE68539007547034',
      amountEur: 12.5,
      remittanceInfo: 'Tafel 3',
    })
    expect(payload.startsWith('BCD\n002\n1\nSCT\n')).toBe(true)
    expect(payload).toContain('Demo Frituur')
    expect(payload).toContain('BE68539007547034')
    expect(payload).toContain('EUR12.50')
    expect(payload).toContain('Tafel 3')
  })

  it('validates plausible IBAN shape', () => {
    expect(isPlausibleIban('BE68539007547034')).toBe(true)
    expect(isPlausibleIban('invalid')).toBe(false)
  })
})

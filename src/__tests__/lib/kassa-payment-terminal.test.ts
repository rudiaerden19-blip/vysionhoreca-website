import {
  activeKassaPaymentTerminals,
  eurosToCents,
  kassaCardPayGoesToCloudTerminal,
  pickDefaultKassaTerminal,
  type KassaPaymentTerminalPublic,
} from '@/lib/kassa-payment-terminal'

const bar: KassaPaymentTerminalPublic = {
  id: 't-bar',
  label: 'Bar',
  provider: 'stripe',
  is_active: true,
}

const off: KassaPaymentTerminalPublic = {
  id: 't-off',
  label: 'Uit',
  provider: 'mollie',
  is_active: false,
}

describe('kassa-payment-terminal (bestaande kassa blijft gelijk zonder lezers)', () => {
  it('geen lezers: CARD/Bancontact gaan niet naar de cloud', () => {
    expect(kassaCardPayGoesToCloudTerminal('CARD', [])).toBe(false)
    expect(kassaCardPayGoesToCloudTerminal('BANCONTACT', undefined)).toBe(false)
    expect(kassaCardPayGoesToCloudTerminal('CARD', [off])).toBe(false)
  })

  it('contant, iDEAL en split nooit naar de lezer', () => {
    expect(kassaCardPayGoesToCloudTerminal('CASH', [bar])).toBe(false)
    expect(kassaCardPayGoesToCloudTerminal('IDEAL', [bar])).toBe(false)
    expect(kassaCardPayGoesToCloudTerminal('SPLIT', [bar])).toBe(false)
  })

  it('met actieve lezer: alleen CARD en Bancontact', () => {
    expect(kassaCardPayGoesToCloudTerminal('CARD', [bar])).toBe(true)
    expect(kassaCardPayGoesToCloudTerminal('BANCONTACT', [bar, off])).toBe(true)
  })

  it('pickDefault: voorkeur, anders eerste actieve', () => {
    const terras: KassaPaymentTerminalPublic = {
      id: 't-terras',
      label: 'Terras',
      provider: 'sumup',
      is_active: true,
    }
    expect(pickDefaultKassaTerminal([bar, terras], 't-terras')?.id).toBe('t-terras')
    expect(pickDefaultKassaTerminal([off, bar], null)?.id).toBe('t-bar')
    expect(pickDefaultKassaTerminal([off], null)).toBeNull()
  })

  it('eurosToCents rondt veilig af', () => {
    expect(eurosToCents(12.34)).toBe(1234)
    expect(eurosToCents(0.1 + 0.2)).toBe(30)
    expect(eurosToCents(-1)).toBe(0)
  })

  it('activeKassaPaymentTerminals filtert inactief', () => {
    expect(activeKassaPaymentTerminals([bar, off]).map((t) => t.id)).toEqual(['t-bar'])
  })
})

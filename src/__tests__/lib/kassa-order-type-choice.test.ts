import {
  KASSA_DEFAULT_ORDER_TYPE,
  readKassaOrderTypeChoice,
  resolveKassaOrderTypeOnLoad,
  writeKassaOrderTypeChoice,
} from '@/lib/kassa-order-type-choice'

describe('kassa order type choice', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('onthoudt de gekozen knop per tenant', () => {
    writeKassaOrderTypeChoice('ohgreen', 'TAKEAWAY')
    writeKassaOrderTypeChoice('thelagoon', 'DELIVERY')
    expect(readKassaOrderTypeChoice('ohgreen')).toBe('TAKEAWAY')
    expect(readKassaOrderTypeChoice('thelagoon')).toBe('DELIVERY')
    expect(readKassaOrderTypeChoice('demo-frituur')).toBeNull()
  })

  it('negeert een onbekende waarde', () => {
    sessionStorage.setItem('vysion-kassa-order-type:ohgreen', 'foo')
    expect(readKassaOrderTypeChoice('ohgreen')).toBeNull()
  })

  it('standaard bij openen is afhalen voor elke tenant', () => {
    expect(KASSA_DEFAULT_ORDER_TYPE).toBe('TAKEAWAY')
    expect(resolveKassaOrderTypeOnLoad('nieuwe-zaak')).toBe('TAKEAWAY')
    writeKassaOrderTypeChoice('ohgreen', 'DINE_IN')
    expect(resolveKassaOrderTypeOnLoad('ohgreen')).toBe('DINE_IN')
  })
})

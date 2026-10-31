import { readKassaOrderTypeChoice, writeKassaOrderTypeChoice } from '@/lib/kassa-order-type-choice'

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
})

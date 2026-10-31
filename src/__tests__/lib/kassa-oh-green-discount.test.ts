import {
  allocateGrossCents,
  isOhGreenKassaTenant,
  kassaCartLinesPricedToGross,
  kassaLineGrossEuro,
  kassaTicketDiscountFromGross,
} from '@/lib/kassa-oh-green-discount'

describe('isOhGreenKassaTenant', () => {
  it('alleen Oh Green', () => {
    expect(isOhGreenKassaTenant('ohgreen')).toBe(true)
    expect(isOhGreenKassaTenant('oh-green')).toBe(true)
    expect(isOhGreenKassaTenant('andere', ' BISTRO OH  GREEN')).toBe(true)
    expect(isOhGreenKassaTenant('blonkys-restaurant')).toBe(false)
    expect(isOhGreenKassaTenant('demo-frituur', 'Frituur')).toBe(false)
  })
})

describe('kassaTicketDiscountFromGross', () => {
  it('haalt 20% van de hele rekening', () => {
    expect(kassaTicketDiscountFromGross(12.5)).toEqual({ discount: 2.5, payable: 10 })
    expect(kassaTicketDiscountFromGross(0)).toEqual({ discount: 0, payable: 0 })
    expect(kassaTicketDiscountFromGross(10.01)).toEqual({ discount: 2, payable: 8.01 })
  })
})

describe('kassaCartLinesPricedToGross', () => {
  it('de som van de regels is het afgeprijsde bedrag', () => {
    const lines = [
      { product: { price: 6 }, quantity: 1, choices: [] },
      { product: { price: 3 }, quantity: 1, choices: [{ price: 1 }] },
    ]
    const priced = kassaCartLinesPricedToGross(lines, 8)
    const sum = Math.round(priced.reduce((s, line) => s + kassaLineGrossEuro(line), 0) * 100) / 100
    expect(sum).toBe(8)
    expect(priced[1].choices?.[0].price).toBe(0)
    expect(allocateGrossCents([600, 400], 800)).toEqual([480, 320])
  })
})

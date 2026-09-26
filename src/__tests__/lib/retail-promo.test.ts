import {
  allocateRetailPromoCharges,
  formatRetailPromoReceiptNote,
  parseRetailPromo,
  retailPromoChargeableTotal,
  retailPromoFreeCount,
  retailPromoIsActive,
} from '@/lib/retail-promo'

const note = { thirdFree: 'derde gratis', line: '{buy}+{free} · {count} gratis' }

describe('retail promo 2+1', () => {
  const promo = parseRetailPromo(2, 1)

  it('rekent de derde pas gratis als die in de mand ligt', () => {
    expect(retailPromoFreeCount(1, promo)).toBe(0)
    expect(retailPromoFreeCount(2, promo)).toBe(0)
    expect(retailPromoFreeCount(3, promo)).toBe(1)
    expect(retailPromoFreeCount(4, promo)).toBe(1)
    expect(retailPromoFreeCount(6, promo)).toBe(2)
    expect(retailPromoChargeableTotal(10, 3, promo)).toBe(20)
    expect(retailPromoChargeableTotal(10, 2, promo)).toBe(20)
    expect(retailPromoChargeableTotal(10, 6, promo)).toBe(40)
  })

  it('zet derde gratis op de bon bij één gratis stuk', () => {
    expect(formatRetailPromoReceiptNote(2, 1, 1, note)).toBe('derde gratis')
    expect(formatRetailPromoReceiptNote(2, 1, 2, note)).toBe('2+1 · 2 gratis')
  })

  it('doet niets zonder beide getallen', () => {
    expect(parseRetailPromo('', '')).toBeNull()
    expect(parseRetailPromo(2, 0)).toBeNull()
    expect(retailPromoChargeableTotal(10, 3, null)).toBe(30)
  })

  it('geldt alleen tussen de datums', () => {
    expect(retailPromoIsActive('2026-09-01', '2026-09-30', '2026-09-26')).toBe(true)
    expect(retailPromoIsActive('2026-09-27', '2026-09-30', '2026-09-26')).toBe(false)
    expect(retailPromoIsActive(null, null, '2026-09-26')).toBe(true)
  })

  it('telt twee artikelen samen en maakt het goedkoopste stuk gratis', () => {
    const charges = allocateRetailPromoCharges(
      [
        {
          key: 'a',
          productId: 'prod-a',
          unitPrice: 10,
          quantity: 2,
          promoBuy: 2,
          promoFree: 1,
          promoPartnerId: 'prod-b',
        },
        {
          key: 'b',
          productId: 'prod-b',
          unitPrice: 4,
          quantity: 1,
          promoBuy: 2,
          promoFree: 1,
          promoPartnerId: 'prod-a',
        },
      ],
      '2026-09-26',
    )
    expect(charges.get('b')).toEqual({ payable: 0, freeQty: 1 })
    expect(charges.get('a')).toEqual({ payable: 20, freeQty: 0 })
  })
})

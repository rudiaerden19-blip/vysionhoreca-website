import {
  applyZReportCashCardShift,
  canonicalKassaCashCardMethod,
  orderAllowsKassaCashCardCorrection,
  zReportCashCardShift,
} from '@/lib/z-report-correct-payment'

describe('z-report-correct-payment', () => {
  it('herkent pin/kaart als CARD en contant als CASH', () => {
    expect(canonicalKassaCashCardMethod('CARD')).toBe('CARD')
    expect(canonicalKassaCashCardMethod('pin')).toBe('CARD')
    expect(canonicalKassaCashCardMethod('kaart')).toBe('CARD')
    expect(canonicalKassaCashCardMethod('CASH')).toBe('CASH')
    expect(canonicalKassaCashCardMethod('contant')).toBe('CASH')
    expect(canonicalKassaCashCardMethod('SPLIT')).toBeNull()
    expect(canonicalKassaCashCardMethod('online')).toBeNull()
  })

  it('staat alleen betaalde kassa-POS cash/card toe', () => {
    expect(
      orderAllowsKassaCashCardCorrection({
        order_type: 'TAKEAWAY',
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: 'CARD',
      }),
    ).toBe(true)
    expect(
      orderAllowsKassaCashCardCorrection({
        order_type: 'TAKEAWAY',
        status: 'confirmed',
        payment_status: 'pending',
        payment_method: 'CARD',
      }),
    ).toBe(false)
    expect(
      orderAllowsKassaCashCardCorrection({
        order_type: 'pickup',
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: 'CARD',
      }),
    ).toBe(false)
    expect(
      orderAllowsKassaCashCardCorrection({
        order_type: 'DINE_IN',
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: 'SPLIT',
      }),
    ).toBe(false)
  })

  it('schuift €46,50 van kaart naar contant zonder het totaal te wijzigen', () => {
    const shift = zReportCashCardShift(46.5, 'CARD', 'CASH')
    expect(shift).toEqual({ cashDelta: 46.5, cardDelta: -46.5 })
    expect(applyZReportCashCardShift(0, 1301.45, shift!)).toEqual({
      cash_payments: 46.5,
      card_payments: 1254.95,
    })
  })

  it('doet niets als bron en doel gelijk zijn', () => {
    expect(zReportCashCardShift(46.5, 'CARD', 'CARD')).toBeNull()
  })
})

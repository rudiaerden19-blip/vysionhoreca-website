import { kassaReceiptTableNumber } from '@/lib/kassa-cart-types'

describe('kassaReceiptTableNumber', () => {
  it('returns table only for DINE_IN', () => {
    expect(kassaReceiptTableNumber('DINE_IN', '12')).toBe('12')
    expect(kassaReceiptTableNumber('TAKEAWAY', '12')).toBe('')
    expect(kassaReceiptTableNumber('DELIVERY', '12')).toBe('')
  })

  it('trims and treats empty as no table', () => {
    expect(kassaReceiptTableNumber('DINE_IN', ' ')).toBe('')
    expect(kassaReceiptTableNumber('DINE_IN', null)).toBe('')
  })
})

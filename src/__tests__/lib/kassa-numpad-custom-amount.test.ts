import {
  kassaCartLineNoteOnProductReceipt,
  kassaDistinctCartLineNotesForReceipt,
} from '@/lib/kassa-cart-line-key'
import {
  kassaNumpadCustomLineCanAdd,
  kassaNumpadShowsCustomLinePanel,
  parseKassaNumpadAmount,
} from '@/lib/kassa-numpad-custom-amount'

describe('kassa-numpad-custom-amount', () => {
  it('parses zero and comma decimals', () => {
    expect(parseKassaNumpadAmount('0')).toBe(0)
    expect(parseKassaNumpadAmount('2,50')).toBe(2.5)
    expect(parseKassaNumpadAmount('')).toBeNull()
  })

  it('allows add for €0 with note only', () => {
    expect(kassaNumpadCustomLineCanAdd(0, 'Gratis sap')).toBe(true)
    expect(kassaNumpadCustomLineCanAdd(0, '')).toBe(false)
    expect(kassaNumpadCustomLineCanAdd(1, '')).toBe(true)
  })

  it('shows panel for zero amount', () => {
    expect(kassaNumpadShowsCustomLinePanel('0')).toBe(true)
    expect(kassaNumpadShowsCustomLinePanel('')).toBe(false)
  })

  it('numpad note with lineNoteAsReceiptName false prints on product line', () => {
    const line = { lineNote: 'Test vis', lineNoteAsReceiptName: false as const }
    expect(kassaCartLineNoteOnProductReceipt(line)).toBe('Test vis')
    expect(kassaDistinctCartLineNotesForReceipt([line])).toEqual([])
  })
})

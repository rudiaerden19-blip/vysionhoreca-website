import {
  buildKassaCartLineKey,
  kassaCartLineNoteOnProductReceipt,
  kassaCartLineOrderNotes,
  kassaDistinctCartLineNotesForReceipt,
  normalizeKassaLineNote,
} from '@/lib/kassa-cart-line-key'

describe('kassa-cart-line-key', () => {
  it('leaves key unchanged when note is empty', () => {
    expect(buildKassaCartLineKey('prod-1', [])).toBe('prod-1')
    expect(buildKassaCartLineKey('prod-1', [], '   ')).toBe('prod-1')
  })

  it('includes choices and distinct notes in cart key', () => {
    const withChoices = buildKassaCartLineKey('p', [{ choiceId: 'b' }, { choiceId: 'a' }])
    expect(withChoices).toBe('p-a-b')
    const withNote = buildKassaCartLineKey('p', [], 'Ahmed')
    expect(withNote.startsWith('p-n-')).toBe(true)
    expect(buildKassaCartLineKey('p', [], 'Ahmed')).not.toBe(
      buildKassaCartLineKey('p', [], 'Sara'),
    )
  })

  it('normalizes line note', () => {
    expect(normalizeKassaLineNote('  foo  ')).toBe('foo')
    expect(normalizeKassaLineNote('')).toBeUndefined()
  })

  it('reads notes from persisted order items', () => {
    expect(kassaCartLineOrderNotes({ notes: ' keuken ' })).toBe('keuken')
    expect(kassaCartLineOrderNotes({ lineNote: 'mand', notes: 'db' })).toBe('mand')
  })

  it('only puts flagged names in receipt heading', () => {
    expect(
      kassaDistinctCartLineNotesForReceipt([
        { lineNote: 'Theo', lineNoteAsReceiptName: true },
        { lineNote: 'Zonder boter' },
        { lineNote: 'theo', lineNoteAsReceiptName: true },
      ]),
    ).toEqual(['Theo'])
    expect(kassaCartLineNoteOnProductReceipt({ lineNote: 'Zonder boter' })).toBe('Zonder boter')
    expect(
      kassaCartLineNoteOnProductReceipt({
        lineNote: 'Theo',
        lineNoteAsReceiptName: true,
      }),
    ).toBeUndefined()
  })
})

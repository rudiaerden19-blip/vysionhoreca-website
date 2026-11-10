import {
  applyKassaOskLineShortcut,
  findKassaOskLineNoteInput,
  normalizeKassaOskLineShortcuts,
  sanitizeKassaOskLineShortcutLabel,
  isAdminOskNextFormField,
  isKassaOskShortcutSlotField,
  shouldOpenAzertyOskForFieldFocus,
} from '@/lib/kassa-osk-line-shortcuts'

describe('kassa-osk-line-shortcuts', () => {
  it('normaliseert naar 10 slots', () => {
    expect(normalizeKassaOskLineShortcuts(['Jan', 'zonder ui'])).toHaveLength(10)
    expect(normalizeKassaOskLineShortcuts(['Jan', 'zonder ui'])[0]).toBe('Jan')
    expect(normalizeKassaOskLineShortcuts(['Jan', 'zonder ui'])[1]).toBe('zonder ui')
  })

  it('kapt labels af op 15 tekens', () => {
    expect(sanitizeKassaOskLineShortcutLabel('  abcdefghijklmnop  ')).toBe('abcdefghijklmno')
  })

  it('admin data-osk-next veld telt als OSK-formulier', () => {
    const root = document.createElement('div')
    root.setAttribute('data-osk-next', 'true')
    const input = document.createElement('input')
    root.appendChild(input)
    document.body.appendChild(root)
    expect(isAdminOskNextFormField(input)).toBe(true)
    document.body.removeChild(root)
  })

  it('sneltekst-slot telt als OSK-veld', () => {
    const input = document.createElement('input')
    input.setAttribute('data-kassa-osk-shortcut-slot', 'true')
    expect(isKassaOskShortcutSlotField(input)).toBe(true)
    expect(shouldOpenAzertyOskForFieldFocus(true, false, input)).toBe(true)
  })

  it('opmerking-veld opent OSK ook bij handmatige modus', () => {
    const input = document.createElement('input')
    input.setAttribute('data-kassa-osk-line-note', 'true')
    expect(shouldOpenAzertyOskForFieldFocus(true, false, input)).toBe(true)
    const plain = document.createElement('input')
    expect(shouldOpenAzertyOskForFieldFocus(true, false, plain)).toBe(false)
    expect(shouldOpenAzertyOskForFieldFocus(true, true, plain)).toBe(true)
  })

  it('findKassaOskLineNoteInput: opties-modal vóór numpad in DOM-volgorde', () => {
    const numpad = document.createElement('input')
    numpad.setAttribute('data-kassa-osk-line-note', 'true')
    document.body.appendChild(numpad)

    const modalRoot = document.createElement('div')
    modalRoot.setAttribute('data-testid', 'kassa-options-modal')
    const modalNote = document.createElement('input')
    modalNote.setAttribute('data-kassa-osk-line-note', 'true')
    modalRoot.appendChild(modalNote)
    document.body.appendChild(modalRoot)

    expect(findKassaOskLineNoteInput(null)).toBe(modalNote)

    document.body.removeChild(modalRoot)
    document.body.removeChild(numpad)
  })

  it('applyKassaOskLineShortcut vuurt programmatic sync-event', () => {
    const input = document.createElement('input')
    input.setAttribute('data-kassa-osk-line-note', 'true')
    document.body.appendChild(input)
    let synced = ''
    const onSync = (e: Event) => {
      synced = (e as CustomEvent<{ value: string }>).detail.value
    }
    input.addEventListener('kassa-osk-programmatic-input', onSync)
    applyKassaOskLineShortcut(input, 'Zonder sla')
    expect(input.value).toBe('Zonder sla')
    expect(synced).toBe('Zonder sla')
    input.removeEventListener('kassa-osk-programmatic-input', onSync)
    document.body.removeChild(input)
  })

  it('voegt sneltekst toe met spatie', () => {
    const input = document.createElement('input')
    input.value = 'Test'
    document.body.appendChild(input)
    applyKassaOskLineShortcut(input, 'Jan')
    expect(input.value).toBe('Test Jan')
    document.body.removeChild(input)
  })
})

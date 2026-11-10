import {
  applyKassaOskLineShortcut,
  normalizeKassaOskLineShortcuts,
  sanitizeKassaOskLineShortcutLabel,
} from '@/lib/kassa-osk-line-shortcuts'

describe('kassa-osk-line-shortcuts', () => {
  it('normaliseert naar 10 slots', () => {
    expect(normalizeKassaOskLineShortcuts(['Jan', 'zonder ui'])).toEqual([
      'Jan',
      'zonder ui',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ])
  })

  it('kapt labels af op 15 tekens', () => {
    expect(sanitizeKassaOskLineShortcutLabel('  abcdefghijklmnop  ')).toBe('abcdefghijklmno')
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

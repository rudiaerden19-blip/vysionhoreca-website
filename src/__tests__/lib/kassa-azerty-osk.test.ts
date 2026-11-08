import {
  applyKassaAzertyOskEdit,
  isKassaAzertyOskEnabled,
  isKassaAzertyOskTextTarget,
  kassaAzertyKeyDisplay,
} from '@/lib/kassa-azerty-osk'

describe('kassa-azerty-osk', () => {
  it('pilot alleen tenant lomichillplay', () => {
    expect(isKassaAzertyOskEnabled('lomichillplay')).toBe(true)
    expect(isKassaAzertyOskEnabled('Lomichillplay')).toBe(true)
    expect(isKassaAzertyOskEnabled('vysion')).toBe(false)
    expect(isKassaAzertyOskEnabled('demo-frituur')).toBe(false)
  })

  it('shift voor letters en leestekens', () => {
    expect(kassaAzertyKeyDisplay('a', true)).toBe('A')
    expect(kassaAzertyKeyDisplay(',', true)).toBe('?')
  })

  it('slaat readOnly numpad display over', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.readOnly = true
    expect(isKassaAzertyOskTextTarget(input)).toBe(false)
  })

  it('past maxLength toe via input event', () => {
    const input = document.createElement('input')
    input.maxLength = 3
    document.body.appendChild(input)
    applyKassaAzertyOskEdit(input, { char: 'a' })
    applyKassaAzertyOskEdit(input, { char: 'b' })
    applyKassaAzertyOskEdit(input, { char: 'c' })
    applyKassaAzertyOskEdit(input, { char: 'd' })
    expect(input.value).toBe('abc')
    document.body.removeChild(input)
  })
})

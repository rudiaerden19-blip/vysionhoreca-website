import {
  kassaUiLayoutIsDark,
  kassaUiLayoutUsesPosLuxury,
  parseKassaUiLayout,
} from './kassa-ui-layout'

describe('parseKassaUiLayout', () => {
  it('houdt een geldige id', () => {
    expect(parseKassaUiLayout('dark', true)).toBe('dark')
    expect(parseKassaUiLayout('speels', false)).toBe('speels')
  })

  it('mapt oude ids', () => {
    expect(parseKassaUiLayout('slate', true)).toBe('dark')
    expect(parseKassaUiLayout('navy', false)).toBe('speels')
  })

  it('valt terug op luxe als donker, light als licht', () => {
    expect(parseKassaUiLayout(null, true)).toBe('luxe')
    expect(parseKassaUiLayout(undefined, null)).toBe('luxe')
    expect(parseKassaUiLayout('nope', false)).toBe('light')
  })
})

describe('kassaUiLayout flags', () => {
  it('alleen light is niet-donker', () => {
    expect(kassaUiLayoutIsDark('light')).toBe(false)
    expect(kassaUiLayoutIsDark('luxe')).toBe(true)
    expect(kassaUiLayoutIsDark('dark')).toBe(true)
    expect(kassaUiLayoutIsDark('speels')).toBe(true)
  })

  it('POS-luxe alleen voor luxe en speels', () => {
    expect(kassaUiLayoutUsesPosLuxury('luxe')).toBe(true)
    expect(kassaUiLayoutUsesPosLuxury('speels')).toBe(true)
    expect(kassaUiLayoutUsesPosLuxury('dark')).toBe(false)
    expect(kassaUiLayoutUsesPosLuxury('light')).toBe(false)
  })
})

import {
  kassaUiLayoutIsDark,
  kassaUiLayoutUsesPosLuxury,
  parseKassaUiLayout,
} from './kassa-ui-layout'

describe('parseKassaUiLayout', () => {
  it('houdt een geldige id', () => {
    expect(parseKassaUiLayout('slate', true)).toBe('slate')
    expect(parseKassaUiLayout('navy', false)).toBe('navy')
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
    expect(kassaUiLayoutIsDark('slate')).toBe(true)
    expect(kassaUiLayoutIsDark('navy')).toBe(true)
  })

  it('POS-luxe alleen voor luxe en navy', () => {
    expect(kassaUiLayoutUsesPosLuxury('luxe')).toBe(true)
    expect(kassaUiLayoutUsesPosLuxury('navy')).toBe(true)
    expect(kassaUiLayoutUsesPosLuxury('slate')).toBe(false)
    expect(kassaUiLayoutUsesPosLuxury('light')).toBe(false)
  })
})

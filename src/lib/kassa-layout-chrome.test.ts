import { KASSA_UI_LAYOUT_OPTIONS } from './kassa-ui-layout'
import {
  kassaLayoutCheckoutBtnClass,
  kassaLayoutChromeBtnClass,
  kassaLayoutHeaderBarClass,
  kassaLayoutPlateBgClass,
  kassaLayoutPosChrome,
  kassaLayoutQuickMenuTileClass,
} from './kassa-layout-chrome'
import { kassaPosButtonClass, kassaPosCheckoutButtonClass } from './kassa-pos-surface'

describe('kassa-layout-chrome — zelfde modes als gewone kassa', () => {
  it('kent Light, Dark, Luxe en Klassiek', () => {
    expect(KASSA_UI_LAYOUT_OPTIONS.map((o) => o.id)).toEqual(['light', 'speels', 'luxe', 'dark'])
    expect(KASSA_UI_LAYOUT_OPTIONS.map((o) => o.labelKey)).toEqual([
      'kassaApp.modeLight',
      'kassaApp.modeDark',
      'kassaApp.modeLuxe',
      'kassaApp.modeClassic',
    ])
  })

  it('Light gebruikt grijze knoppen, geen luxe-goud', () => {
    const cls = kassaLayoutChromeBtnClass('light', false)
    expect(cls).toContain('#4a4a4a')
    expect(cls).not.toContain('#c4a46a')
    expect(kassaLayoutPlateBgClass('light')).toBe('bg-[#e3e3e3]')
    expect(kassaLayoutHeaderBarClass('light')).toBe('bg-black')
    expect(kassaLayoutCheckoutBtnClass('light')).toContain('bg-emerald-500')
  })

  it('Klassiek gebruikt gunmetal-knoppen, geen luxe-goud', () => {
    const cls = kassaLayoutChromeBtnClass('dark', false)
    expect(cls).toContain('#2d2d2d')
    expect(cls).not.toContain('#c4a46a')
    expect(kassaLayoutPlateBgClass('dark')).toBe('bg-[#0b0f14]')
    expect(kassaLayoutHeaderBarClass('dark')).toBe('bg-black')
    expect(kassaLayoutQuickMenuTileClass('dark')).toContain('#2d2d2d')
  })

  it('Dark (speels) deelt POS-chrome met de gewone kassa', () => {
    expect(kassaLayoutPosChrome('speels')).toBe('speels')
    expect(kassaLayoutChromeBtnClass('speels', true)).toBe(kassaPosButtonClass(true, 'speels'))
    expect(kassaLayoutCheckoutBtnClass('speels')).toBe(kassaPosCheckoutButtonClass('speels'))
  })

  it('Luxe deelt POS-chrome met de gewone kassa', () => {
    expect(kassaLayoutPosChrome('luxe')).toBe('luxe')
    expect(kassaLayoutChromeBtnClass('luxe', true)).toBe(kassaPosButtonClass(true, 'luxe'))
    expect(kassaLayoutCheckoutBtnClass('luxe')).toBe(kassaPosCheckoutButtonClass('luxe'))
    expect(kassaLayoutHeaderBarClass('luxe')).toContain('bg-transparent')
  })
})

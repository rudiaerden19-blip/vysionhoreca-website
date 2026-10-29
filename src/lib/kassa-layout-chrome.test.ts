import { KASSA_UI_LAYOUT_OPTIONS } from './kassa-ui-layout'
import {
  kassaLayoutCheckoutBtnClass,
  kassaLayoutChromeBtnClass,
  kassaLayoutHeaderBarClass,
  kassaLayoutMenuScrollFlatBgClass,
  kassaLayoutPlateBgClass,
  kassaLayoutPosChrome,
  kassaLayoutQuickMenuTileClass,
} from './kassa-layout-chrome'
import { kassaPosButtonClass, kassaPosCheckoutButtonClass } from './kassa-pos-surface'

describe('kassa-layout-chrome — zelfde modes als gewone kassa', () => {
  it('kent Light, Dark (speels) en Klassiek', () => {
    expect(KASSA_UI_LAYOUT_OPTIONS.map((o) => o.id)).toEqual(['light', 'speels', 'dark'])
    expect(KASSA_UI_LAYOUT_OPTIONS.map((o) => o.labelKey)).toEqual([
      'kassaApp.modeLight',
      'kassaApp.modeDark',
      'kassaApp.modeClassic',
    ])
  })

  it('Light gebruikt website-blauw, geen grijs en geen luxe-goud', () => {
    const cls = kassaLayoutChromeBtnClass('light', false)
    expect(cls).toContain('#3C4D6B')
    expect(cls).not.toContain('#4a4a4a')
    expect(cls).not.toContain('#c4a46a')
    expect(kassaLayoutQuickMenuTileClass('light')).toContain('#3C4D6B')
    expect(kassaLayoutPlateBgClass('light')).toBe('bg-[#e3e3e3]')
    expect(kassaLayoutHeaderBarClass('light')).toBe('bg-black')
    expect(kassaLayoutCheckoutBtnClass('light')).toContain('bg-emerald-500')
  })

  it('Klassiek gebruikt lichter grijs voor knoppen, het kader blijft donker', () => {
    const cls = kassaLayoutChromeBtnClass('dark', false)
    expect(cls).toContain('#5a5a5a')
    expect(cls).not.toContain('#c4a46a')
    expect(kassaLayoutPlateBgClass('dark')).toBe('bg-[#0b0f14]')
    expect(kassaLayoutHeaderBarClass('dark')).toBe('bg-black')
    expect(kassaLayoutQuickMenuTileClass('dark')).toContain('#5a5a5a')
  })

  it('Dark (speels) houdt afrekenen, knoppen zijn lichter grijs', () => {
    expect(kassaLayoutPosChrome('speels')).toBe('speels')
    expect(kassaLayoutPosChrome('dark')).toBe('speels')
    expect(kassaLayoutChromeBtnClass('speels', false)).toContain('#5a5a5a')
    expect(kassaLayoutChromeBtnClass('speels', false)).not.toBe(kassaPosButtonClass(false, 'speels'))
    expect(kassaLayoutCheckoutBtnClass('speels')).toBe(kassaPosCheckoutButtonClass('speels'))
    expect(kassaLayoutPlateBgClass('speels')).toContain('kassa-speels-plate-grain')
    expect(kassaLayoutHeaderBarClass('speels')).toContain('kassa-speels-plate-grain')
    expect(kassaLayoutMenuScrollFlatBgClass('speels')).toContain('bg-[#363636]')
    expect(kassaLayoutMenuScrollFlatBgClass('speels')).toContain('kassa-speels-menu-scroll')
    expect(kassaLayoutMenuScrollFlatBgClass('speels')).not.toContain('kassa-speels-plate-grain')
  })
})

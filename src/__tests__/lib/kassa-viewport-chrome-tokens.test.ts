import {
  KASSA_LAYOUT_REGRESSION_FRAME_IDS,
  KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX,
  KASSA_SIDEBAR_WIDTH_WIDE15_PX,
  KASSA_SIDEBAR_WIDTH_DEFAULT_LG_PX,
  getKassaViewportChromeTokens,
  kassaViewportChromeCssVars,
} from '@/lib/kassa-viewport-chrome-tokens'

describe('kassa-viewport-chrome-tokens', () => {
  it('elk profiel heeft eigen sidebar — geen overlap tussen 15, 17 en 21', () => {
    const w15 = getKassaViewportChromeTokens('wide15')
    const sxga = getKassaViewportChromeTokens('sxga')
    const def = getKassaViewportChromeTokens('default')
    expect(w15.sidebarWidthPx).toBe(KASSA_SIDEBAR_WIDTH_WIDE15_PX)
    expect(sxga.sidebarWidthPx).toBe(KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX)
    expect(def.sidebarWidthPx).toBe(KASSA_SIDEBAR_WIDTH_DEFAULT_LG_PX)
    expect(new Set([w15.sidebarWidthPx, sxga.sidebarWidthPx, def.sidebarWidthPx]).size).toBe(3)
  })

  it('OSK-inset volgt mand per profiel', () => {
    const w15 = getKassaViewportChromeTokens('wide15')
    expect(w15.oskRightInsetPx).toBe(w15.sidebarWidthPx + 4)
    const def = getKassaViewportChromeTokens('default')
    expect(def.oskRightInsetPx).toBeGreaterThan(w15.oskRightInsetPx)
  })

  it('CSS-variabelen op root', () => {
    const vars = kassaViewportChromeCssVars(getKassaViewportChromeTokens('wide15'))
    expect(vars['--kassa-sidebar-width']).toBe('268px')
    expect(vars['--kassa-osk-right-inset']).toBe('272px')
  })

  it('regressie-frames bevatten 21, 15 en 17', () => {
    expect(KASSA_LAYOUT_REGRESSION_FRAME_IDS).toEqual(['15', '17', '21'])
  })
})

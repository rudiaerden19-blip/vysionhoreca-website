import {
  KASSA_LAYOUT_REGRESSION_FRAME_IDS,
  KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX,
  KASSA_SIDEBAR_WIDTH_WIDE15_PX,
  KASSA_SIDEBAR_WIDTH_DEFAULT_LG_PX,
  KASSA_SIDEBAR_WIDTH_IPAD_10_PX,
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

  it('15/17: OSK over volle breedte; overige profielen inset = mand + gutter', () => {
    expect(getKassaViewportChromeTokens('wide15').oskRightInsetPx).toBe(4)
    expect(getKassaViewportChromeTokens('sxga').oskRightInsetPx).toBe(4)
    const def = getKassaViewportChromeTokens('default')
    expect(def.oskRightInsetPx).toBe(def.sidebarWidthPx + 4)
    const ipad = getKassaViewportChromeTokens('ipad_10')
    expect(ipad.oskRightInsetPx).toBe(ipad.sidebarWidthPx + 4)
  })

  it('CSS-variabelen op root', () => {
    const w15 = getKassaViewportChromeTokens('wide15')
    const vars = kassaViewportChromeCssVars(w15)
    expect(vars['--kassa-sidebar-width']).toBe('400px')
    expect(vars['--kassa-osk-right-inset']).toBe('4px')
    expect(vars['--kassa-menu-tile-boost']).toBe('1.06')
    expect(w15.menuClassicGridCols).toBe(4)
  })

  it('vijf platformprofielen met vaste defaults', () => {
    const ipad = getKassaViewportChromeTokens('ipad_10')
    expect(ipad.menuClassicGridCols).toBe(4)
    expect(ipad.profile).toBe('ipad_10')
    expect(ipad.sidebarWidthPx).toBe(KASSA_SIDEBAR_WIDTH_IPAD_10_PX)
    expect(ipad.oskRightInsetPx).toBe(KASSA_SIDEBAR_WIDTH_IPAD_10_PX + 4)
  })

  it('regressie-frames bevatten 21, 15 en 17', () => {
    expect(KASSA_LAYOUT_REGRESSION_FRAME_IDS).toEqual(['15', '17', '21'])
  })
})

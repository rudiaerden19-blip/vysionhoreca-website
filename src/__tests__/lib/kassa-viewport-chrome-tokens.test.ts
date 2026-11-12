import {
  KASSA_AZERTY_OSK_NUMPAD_KEY_WIDTH_DEFAULT,
  KASSA_AZERTY_OSK_NUMPAD_KEY_WIDTH_WIDE_COMPACT,
  KASSA_LAYOUT_REGRESSION_FRAME_IDS,
  KASSA_LUXURY_HEADER_TENANT_OVERLAY_PADDING_DEFAULT,
  KASSA_SXGA_HEADER_QUICK_LINK_LABEL,
  KASSA_SXGA_INLINE_BTN_LABEL,
  KASSA_SXGA_LUXURY_HEADER_TENANT_NAME_SIZE_CLASS,
  KASSA_SXGA_LUXURY_HEADER_TENANT_OVERLAY_INSET,
  KASSA_SXGA_SIDEBAR_ACTION_LABEL,
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

  it('15/17: compacter numpad; 21″ ongewijzigd (4cm)', () => {
    expect(getKassaViewportChromeTokens('wide15').oskNumpadKeyWidth).toBe(
      KASSA_AZERTY_OSK_NUMPAD_KEY_WIDTH_WIDE_COMPACT,
    )
    expect(getKassaViewportChromeTokens('sxga').oskNumpadKeyWidth).toBe(
      KASSA_AZERTY_OSK_NUMPAD_KEY_WIDTH_WIDE_COMPACT,
    )
    expect(getKassaViewportChromeTokens('default').oskNumpadKeyWidth).toBe(
      KASSA_AZERTY_OSK_NUMPAD_KEY_WIDTH_DEFAULT,
    )
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
    expect(vars['--kassa-osk-numpad-key-max-width']).toBe(
      KASSA_AZERTY_OSK_NUMPAD_KEY_WIDTH_WIDE_COMPACT,
    )
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

  it('17″ chrome-labels groter dan 11px baseline (lab = sxga profiel)', () => {
    expect(KASSA_SXGA_HEADER_QUICK_LINK_LABEL).toContain('text-xs')
    expect(KASSA_SXGA_HEADER_QUICK_LINK_LABEL).toContain('sm:text-sm')
    expect(KASSA_SXGA_SIDEBAR_ACTION_LABEL).toContain('sm:text-sm')
    expect(KASSA_SXGA_INLINE_BTN_LABEL).not.toContain('text-[11px]')
  })

  it('17″ speels header: zaaknaam-band tussen knopgroepen, kleiner dan 21″', () => {
    expect(KASSA_SXGA_LUXURY_HEADER_TENANT_OVERLAY_INSET).toMatch(/left-\[.+\] right-\[.+\]/)
    expect(KASSA_LUXURY_HEADER_TENANT_OVERLAY_PADDING_DEFAULT).toContain('px-[5.5rem]')
    expect(KASSA_SXGA_LUXURY_HEADER_TENANT_NAME_SIZE_CLASS).toContain('text-sm')
    expect(KASSA_SXGA_LUXURY_HEADER_TENANT_NAME_SIZE_CLASS).not.toContain('text-lg')
  })
})

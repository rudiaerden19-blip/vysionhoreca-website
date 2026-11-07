import {
  isIpadDisguisedAsMac,
  isKassaIpadClient,
  isSxga17CssViewport,
  isWide15CssViewport,
  kassaDefaultMenuClassicGridCols,
  kassaDefaultMenuGridTailwindCols,
  resolveKassaViewportProfile,
} from '@/lib/kassa-viewport-profile'

describe('kassa-viewport-profile', () => {
  it('houdt 17″ SXGA 1280×1024 apart', () => {
    expect(isSxga17CssViewport(1280, 1024)).toBe(true)
    expect(isWide15CssViewport(1280, 1024)).toBe(false)
    expect(resolveKassaViewportProfile({ cssW: 1280, cssH: 1024 })).toBe('sxga17')
    expect(resolveKassaViewportProfile({ cssW: 1024, cssH: 819 })).toBe('sxga17')
  })

  it('herkent 15″ breedbeeld als wide15, niet als SXGA', () => {
    expect(resolveKassaViewportProfile({ cssW: 1366, cssH: 768 })).toBe('wide15')
    expect(resolveKassaViewportProfile({ cssW: 1280, cssH: 800 })).toBe('wide15')
    expect(resolveKassaViewportProfile({ cssW: 1536, cssH: 864 })).toBe('wide15')
    expect(resolveKassaViewportProfile({ cssW: 1024, cssH: 768 })).toBe('wide15')
    expect(resolveKassaViewportProfile({ cssW: 1440, cssH: 900 })).toBe('wide15')
    expect(resolveKassaViewportProfile({ cssW: 1440, cssH: 932 })).toBe('wide15')
    expect(resolveKassaViewportProfile({ cssW: 1710, cssH: 1107 })).toBe('wide15')
    expect(isSxga17CssViewport(1366, 768)).toBe(false)
  })

  it('zet een MacBook niet als iPad (21″-layout)', () => {
    expect(
      isIpadDisguisedAsMac({ platform: 'MacIntel', maxTouchPoints: 5, pointerCoarse: false }),
    ).toBe(false)
    expect(
      isIpadDisguisedAsMac({ platform: 'MacIntel', maxTouchPoints: 5, pointerCoarse: true }),
    ).toBe(true)
  })

  it('herkent iPad voor menu-raster-cap, niet iPhone of desktop-Mac', () => {
    expect(
      isKassaIpadClient({
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
        pointerCoarse: true,
      }),
    ).toBe(true)
    expect(
      isKassaIpadClient({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
        pointerCoarse: true,
      }),
    ).toBe(true)
    expect(
      isKassaIpadClient({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        platform: 'iPhone',
        maxTouchPoints: 5,
        pointerCoarse: true,
      }),
    ).toBe(false)
    expect(
      isKassaIpadClient({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
        platform: 'MacIntel',
        maxTouchPoints: 0,
        pointerCoarse: false,
      }),
    ).toBe(false)
  })

  it('zet iPad raster op 4 kolommen, desktop op 6 xl', () => {
    expect(kassaDefaultMenuGridTailwindCols(true)).toContain('xl:grid-cols-4')
    expect(kassaDefaultMenuGridTailwindCols(true)).not.toContain('grid-cols-5')
    expect(kassaDefaultMenuGridTailwindCols(false)).toContain('xl:grid-cols-6')
    expect(
      kassaDefaultMenuClassicGridCols({ compactChrome: false, ipadClient: true }),
    ).toBe(4)
    expect(
      kassaDefaultMenuClassicGridCols({ compactChrome: true, ipadClient: true }),
    ).toBe(5)
  })

  it('laat 21–22″ en volle HD met rust', () => {
    expect(resolveKassaViewportProfile({ cssW: 1920, cssH: 1080 })).toBe('default')
    expect(resolveKassaViewportProfile({ cssW: 1680, cssH: 1050 })).toBe('default')
    expect(resolveKassaViewportProfile({ cssW: 1920, cssH: 1200 })).toBe('default')
    expect(isWide15CssViewport(1920, 1080)).toBe(false)
  })

  it('17″ SXGA wint van 15″ als het paneel 1280×1024 is', () => {
    expect(
      resolveKassaViewportProfile({
        cssW: 1366,
        cssH: 768,
        screenW: 1280,
        screenH: 1024,
      }),
    ).toBe('sxga17')
  })
})

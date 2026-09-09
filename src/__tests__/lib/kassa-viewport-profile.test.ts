import {
  isSxga17CssViewport,
  isWide15CssViewport,
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
    expect(isSxga17CssViewport(1366, 768)).toBe(false)
  })

  it('laat 21″ / volle 1080p met rust', () => {
    expect(resolveKassaViewportProfile({ cssW: 1920, cssH: 1080 })).toBe('default')
    expect(isWide15CssViewport(1920, 1080)).toBe(false)
  })
})

import { applyProfileSettingsToChromeTokens } from '@/lib/kassa-viewport-profile-settings'
import { KASSA_SIDEBAR_WIDTH_WIDE15_PX, getKassaViewportChromeTokens } from '@/lib/kassa-viewport-chrome-tokens'

describe('kassa-viewport-profile-settings', () => {
  it('override raakt alleen het gekozen profiel', () => {
    const wide = applyProfileSettingsToChromeTokens('wide15', { sidebarWidthPx: 280 })
    const def = getKassaViewportChromeTokens('default')
    expect(wide.sidebarWidthPx).toBe(280)
    expect(def.sidebarWidthPx).not.toBe(280)
    expect(getKassaViewportChromeTokens('wide15').sidebarWidthPx).toBe(KASSA_SIDEBAR_WIDTH_WIDE15_PX)
  })

  it('tegel-boost per profiel', () => {
    const t = applyProfileSettingsToChromeTokens('sxga', { menuTileHeightBoost: 1.2 })
    expect(t.profile).toBe('sxga')
    expect(t.menuTileHeightBoost).toBe(1.2)
    expect(getKassaViewportChromeTokens('wide15').menuTileHeightBoost).toBe(1.08)
  })
})

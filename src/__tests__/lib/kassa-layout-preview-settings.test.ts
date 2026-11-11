import { buildKassaLayoutPreviewKassaUrl, KASSA_LAYOUT_LAB_FRAMES } from '@/lib/kassa-layout-preview'
import { resolveKassaChromeTokensForKassa } from '@/lib/kassa-viewport-profile-settings-client'
describe('kassa layout lab chrome', () => {
  it('lab-URL zet profiel + viewport, geen ingebakken k_sidebar', () => {
    const frame = KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === '15')!
    const url = buildKassaLayoutPreviewKassaUrl('demo', frame, 'https://x.test')
    expect(url).toContain('kvp=wide15')
    expect(url).toContain('lab_w=1366')
    expect(url).not.toContain('k_sidebar=')
  })

  it('preview: studio-map + URL-draft (URL wint)', () => {
    const prev = window.location.href
    window.history.replaceState(
      {},
      '',
      '/shop/x/admin/kassa?kassa_layout_preview=1&vp=wide15&kvp=wide15&k_sidebar=400&k_boost=1.06&k_cols=4&k_gap=16&k_rows=3',
    )
    try {
      const t = resolveKassaChromeTokensForKassa('wide15', {
        wide15: {
          sidebarWidthPx: 268,
          menuTileHeightBoost: 1.08,
          menuClassicGridCols: 5,
          menuGridGapPx: 16,
          menuVisibleRows: 3,
        },
      })
      expect(t.sidebarWidthPx).toBe(400)
      expect(t.menuTileHeightBoost).toBe(1.06)
      expect(t.menuClassicGridCols).toBe(4)
    } finally {
      window.history.replaceState({}, '', prev)
    }
  })

  it('preview zonder k_*: studio zelfde als zaak', () => {
    const prev = window.location.href
    window.history.replaceState(
      {},
      '',
      '/shop/x/admin/kassa?kassa_layout_preview=1&kvp=ipad_10',
    )
    try {
      const t = resolveKassaChromeTokensForKassa('ipad_10', {
        ipad_10: { sidebarWidthPx: 372 },
      })
      expect(t.sidebarWidthPx).toBe(372)
    } finally {
      window.history.replaceState({}, '', prev)
    }
  })
})

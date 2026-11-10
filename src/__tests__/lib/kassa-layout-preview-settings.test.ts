import { buildKassaLayoutPreviewKassaUrl, KASSA_LAYOUT_LAB_FRAMES } from '@/lib/kassa-layout-preview'
import { resolveKassaChromeTokensForKassa } from '@/lib/kassa-viewport-profile-settings-client'
import { KASSA_SIDEBAR_WIDTH_WIDE15_PX } from '@/lib/kassa-viewport-chrome-tokens'

describe('kassa layout lab chrome', () => {
  it('lab-URL draagt code-defaults voor 15″ mee', () => {
    const frame = KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === '15')!
    const url = buildKassaLayoutPreviewKassaUrl('demo', frame, 'https://x.test')
    expect(url).toContain(`k_sidebar=${KASSA_SIDEBAR_WIDTH_WIDE15_PX}`)
    expect(url).toContain('k_boost=1.06')
    expect(url).toContain('lab_w=1366')
  })

  it('preview-modus negeert Supabase-map (studio-override)', () => {
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
})

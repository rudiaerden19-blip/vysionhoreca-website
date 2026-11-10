import {
  buildKassaLayoutPreviewKassaUrl,
  KASSA_LAYOUT_LAB_FRAMES,
  resolveKassaLayoutPreviewChrome,
  resolveKassaLayoutPreviewViewportPixels,
} from '@/lib/kassa-layout-preview'

describe('kassa-layout-preview', () => {
  it('lab frames bevatten 21, 15, 17 en meerdere iPads', () => {
    const ids = KASSA_LAYOUT_LAB_FRAMES.map((f) => f.id)
    expect(ids).toContain('21')
    expect(ids).toContain('15')
    expect(ids).toContain('17')
    expect(ids.some((id) => id.includes('ipad'))).toBe(true)
  })

  it('preview chrome uit query', () => {
    const sp = new URLSearchParams('kassa_layout_preview=1&vp=wide15&ipad=0')
    expect(resolveKassaLayoutPreviewChrome(sp)).toEqual({
      sxgaDense: false,
      wide15: true,
      ipadClient: false,
    })
    const ipad = new URLSearchParams('kassa_layout_preview=1&vp=default&ipad=1')
    expect(resolveKassaLayoutPreviewChrome(ipad)?.ipadClient).toBe(true)
  })

  it('bouwt kassa-url voor tenant', () => {
    const url = buildKassaLayoutPreviewKassaUrl('oh-green', KASSA_LAYOUT_LAB_FRAMES[0], 'https://x.test')
    expect(url).toContain('/shop/oh-green/admin/kassa')
    expect(url).toContain('kassa_layout_preview=1')
    expect(url).toContain('vp=default')
    expect(url).toContain('lab_w=1920')
    expect(url).toContain('lab_h=1080')
  })

  it('preview viewport uit lab_w/lab_h', () => {
    const sp = new URLSearchParams(
      'kassa_layout_preview=1&vp=wide15&lab_w=1366&lab_h=768',
    )
    expect(resolveKassaLayoutPreviewViewportPixels(sp)).toEqual({ w: 1366, h: 768 })
  })
})

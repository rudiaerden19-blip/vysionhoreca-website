import {
  persistKassaViewportProfileContext,
  readKassaViewportProfileContextSession,
  stickyKassaViewportProfileId,
  withKassaViewportProfileContext,
} from '@/lib/kassa-viewport-profile-context'

describe('kassa-viewport-profile-context', () => {
  beforeEach(() => {
    sessionStorage.clear()
    window.history.replaceState({}, '', 'http://localhost/shop/demo/admin/kassa')
  })

  it('bewaart kvp en lab-params in sessionStorage', () => {
    const sp = new URLSearchParams(
      'kvp=ipad_10&kassa_layout_preview=1&vp=default&ipad=1&lab_w=1080&lab_h=810',
    )
    persistKassaViewportProfileContext('ipad_10', sp)
    expect(stickyKassaViewportProfileId()).toBe('ipad_10')
    const session = readKassaViewportProfileContextSession()
    expect(session?.params.lab_w).toBe('1080')
    expect(session?.params.kvp).toBe('ipad_10')
  })

  it('plakt context op keuken-link na kassa-lab', () => {
    persistKassaViewportProfileContext(
      'ipad_10',
      new URLSearchParams(
        'kvp=ipad_10&kassa_layout_preview=1&vp=default&ipad=1&lab_w=1080&lab_h=810',
      ),
    )
    window.history.replaceState({}, '', 'http://localhost/keuken/demo')
    const href = withKassaViewportProfileContext('/shop/demo/admin/kassa')
    expect(href).toContain('kvp=ipad_10')
    expect(href).toContain('kassa_layout_preview=1')
    expect(href).toContain('lab_w=1080')
  })
})

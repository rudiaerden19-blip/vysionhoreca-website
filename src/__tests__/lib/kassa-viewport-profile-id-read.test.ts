import { readKassaViewportProfileIdFromWindow } from '@/lib/kassa-viewport-profile-id'
import { persistKassaViewportProfileContext } from '@/lib/kassa-viewport-profile-context'

describe('readKassaViewportProfileIdFromWindow', () => {
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight

  beforeEach(() => {
    sessionStorage.clear()
    window.history.replaceState({}, '', 'http://localhost/shop/x/admin/kassa')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1080 })
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight })
  })

  it('lab: vp=sxga17 in sessie wint vóór sticky kvp=default (21″)', () => {
    persistKassaViewportProfileContext(
      'default',
      new URLSearchParams(
        'kvp=default&kassa_layout_preview=1&vp=default&lab_w=1920&lab_h=1080',
      ),
    )
    persistKassaViewportProfileContext(
      'sxga',
      new URLSearchParams(
        'kvp=sxga&kassa_layout_preview=1&vp=sxga17&lab_w=1280&lab_h=1024&ipad=0',
      ),
    )
    window.history.replaceState({}, '', 'http://localhost/shop/x/admin/kassa')
    expect(readKassaViewportProfileIdFromWindow()).toBe('sxga')
  })

  it('productie-kiosk: geen sticky default — 1280×1024 → sxga', () => {
    persistKassaViewportProfileContext(
      'default',
      new URLSearchParams('kvp=default'),
    )
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1024 })
    expect(readKassaViewportProfileIdFromWindow()).toBe('sxga')
  })
})

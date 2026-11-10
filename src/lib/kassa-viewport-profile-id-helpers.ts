import { resolveKassaLayoutPreviewChrome } from '@/lib/kassa-layout-preview'
import {
  resolveKassaViewportProfileIdFromWindow,
  type KassaViewportProfileId,
  isKassaViewportProfileId,
} from '@/lib/kassa-viewport-profile-id'
import {
  readKassaIpadClientFromWindow,
  readKassaViewportProfileFromWindow,
} from '@/lib/kassa-viewport-profile'

export function readKassaChromeFlagsForProfileId(): {
  wide15: boolean
  sxgaDense: boolean
  ipadClient: boolean
} {
  if (typeof window !== 'undefined') {
    const preview = resolveKassaLayoutPreviewChrome(new URLSearchParams(window.location.search))
    if (preview) return preview
  }
  const vp = readKassaViewportProfileFromWindow()
  return {
    sxgaDense: vp === 'sxga17',
    wide15: vp === 'wide15',
    ipadClient: readKassaIpadClientFromWindow(),
  }
}

export function readKassaViewportProfileIdFromBrowser(): KassaViewportProfileId {
  if (typeof window === 'undefined') return 'default'
  const sp = new URLSearchParams(window.location.search)
  const forced = sp.get('kvp')
  if (isKassaViewportProfileId(forced)) return forced
  const flags = readKassaChromeFlagsForProfileId()
  const vv = window.visualViewport
  const cssW = Math.max(
    1,
    Math.floor(vv?.width != null && vv.width > 0 ? vv.width : window.innerWidth),
  )
  const cssH = Math.max(
    1,
    Math.floor(vv?.height != null && vv.height > 0 ? vv.height : window.innerHeight),
  )
  return resolveKassaViewportProfileIdFromWindow({
    ...flags,
    cssW,
    cssH,
  })
}

/**
 * Platform-profielen — één ID per schermklasse (superadmin studio + tokens).
 * Wijzigingen aan één ID raken nooit een ander ID.
 */

import type { KassaLayoutLabFrame } from '@/lib/kassa-layout-preview'
import { KASSA_LAYOUT_LAB_FRAMES, resolveKassaLayoutPreviewChrome } from '@/lib/kassa-layout-preview'
import {
  persistKassaViewportProfileContext,
  stickyKassaViewportProfileId,
} from '@/lib/kassa-viewport-profile-context'
import {
  readKassaIpadClientFromWindow,
  readKassaViewportProfileFromWindow,
} from '@/lib/kassa-viewport-profile'

export const KASSA_VIEWPORT_PROFILE_IDS = [
  'wide15',
  'sxga',
  'default',
  'ipad_129',
  'ipad_10',
] as const

export type KassaViewportProfileId = (typeof KASSA_VIEWPORT_PROFILE_IDS)[number]

export const KASSA_PLATFORM_TENANT_SLUG = '_platform'

export type KassaViewportProfileMeta = {
  id: KassaViewportProfileId
  labelNl: string
  /** Layout-lab frame id */
  labFrameId: string
}

export const KASSA_VIEWPORT_PROFILE_REGISTRY: Record<
  KassaViewportProfileId,
  KassaViewportProfileMeta
> = {
  wide15: { id: 'wide15', labelNl: '15 inch breedbeeld', labFrameId: '15' },
  sxga: { id: 'sxga', labelNl: '17 inch vierkant (SXGA)', labFrameId: '17' },
  default: { id: 'default', labelNl: '21 inch Full HD', labFrameId: '21' },
  ipad_129: { id: 'ipad_129', labelNl: 'iPad 12,9 inch', labFrameId: 'ipad-pro-13' },
  ipad_10: { id: 'ipad_10', labelNl: 'iPad 10 inch', labFrameId: 'ipad-10' },
}

export function kassaLabFrameForProfileId(
  profileId: KassaViewportProfileId,
): KassaLayoutLabFrame | undefined {
  const labId = KASSA_VIEWPORT_PROFILE_REGISTRY[profileId]?.labFrameId
  return KASSA_LAYOUT_LAB_FRAMES.find((f) => f.id === labId)
}

export function isKassaViewportProfileId(raw: string | null | undefined): raw is KassaViewportProfileId {
  if (!raw) return false
  return (KASSA_VIEWPORT_PROFILE_IDS as readonly string[]).includes(raw.trim())
}

function readKassaChromeFlagsForProfileId(): {
  wide15: boolean
  sxgaDense: boolean
  ipadClient: boolean
} {
  if (typeof window !== 'undefined') {
    const preview = resolveKassaLayoutPreviewChrome(new URLSearchParams(window.location.search))
    if (preview) return preview
  }
  const ipadClient = readKassaIpadClientFromWindow()
  if (ipadClient) {
    return { sxgaDense: false, wide15: false, ipadClient: true }
  }
  const vp = readKassaViewportProfileFromWindow()
  return {
    sxgaDense: vp === 'sxga17',
    wide15: vp === 'wide15',
    ipadClient: false,
  }
}

/** iPad landschap: logische viewport → ipad-profiel (anders desktop-profielen). */
export function resolveKassaViewportProfileIdFromWindow(input: {
  wide15: boolean
  sxgaDense: boolean
  ipadClient: boolean
  cssW: number
  cssH: number
  forcedProfileId?: KassaViewportProfileId | null
}): KassaViewportProfileId {
  if (input.forcedProfileId) return input.forcedProfileId
  if (input.ipadClient) {
    const w = Math.max(input.cssW, input.cssH)
    const h = Math.min(input.cssW, input.cssH)
    /* 12.9″ Pro-klasse (lab ~1366×1024); alle andere iPads → ipad_10 chrome. */
    if (w >= 1300 && h >= 980) return 'ipad_129'
    return 'ipad_10'
  }
  if (input.wide15) return 'wide15'
  if (input.sxgaDense) return 'sxga'
  return 'default'
}

export function readKassaViewportProfileIdFromWindow(): KassaViewportProfileId {
  if (typeof window === 'undefined') return 'default'
  try {
    const sp = new URLSearchParams(window.location.search)
    const forced = sp.get('kvp')
    if (isKassaViewportProfileId(forced)) {
      persistKassaViewportProfileContext(forced, sp)
      return forced
    }
    const sticky = stickyKassaViewportProfileId()
    if (sticky) return sticky

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
    const resolved = resolveKassaViewportProfileIdFromWindow({
      ...flags,
      cssW,
      cssH,
    })
    persistKassaViewportProfileContext(resolved, sp)
    return resolved
  } catch {
    return 'default'
  }
}

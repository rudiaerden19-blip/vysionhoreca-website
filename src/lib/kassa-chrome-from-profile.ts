/**
 * Lab + device: layout/chrome-afgeleiden uit één profiel-id (geen losse viewport-heuristiek).
 */
import type { KassaViewportProfileId } from '@/lib/kassa-viewport-profile-id'
import { readKassaIpadClientFromWindow } from '@/lib/kassa-viewport-profile'

export type KassaChromeDensity = 'wide15' | 'sxga' | 'default'

export function kassaChromeDensityFromProfileId(
  profileId: KassaViewportProfileId,
): KassaChromeDensity {
  if (profileId === 'wide15') return 'wide15'
  if (profileId === 'sxga') return 'sxga'
  return 'default'
}

export function kassaCompactChromeFromProfileId(profileId: KassaViewportProfileId): boolean {
  return profileId === 'wide15' || profileId === 'sxga'
}

export function isKassaTabletViewportProfile(profileId: KassaViewportProfileId): boolean {
  return profileId === 'ipad_10' || profileId === 'ipad_129'
}

/** Raster-cap + sidebar-css: tablet-profiel of echte iPad-client. */
export function kassaIpadTabletLayoutActive(
  profileId: KassaViewportProfileId,
  ipadClient?: boolean,
): boolean {
  if (isKassaTabletViewportProfile(profileId)) return true
  if (ipadClient === undefined) {
    if (typeof window === 'undefined') return false
    return readKassaIpadClientFromWindow()
  }
  return ipadClient
}

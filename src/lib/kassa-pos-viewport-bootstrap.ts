/**
 * Eén bootstrap voor kassa, keuken, display: viewport-meta + sessie = lab ≡ hardware.
 */

import { applyKassaLayoutPreviewViewportFromSearchParams } from '@/lib/kassa-layout-preview'
import {
  mergedKassaPosSearchParams,
  persistKassaViewportProfileContext,
} from '@/lib/kassa-viewport-profile-context'
import { readKassaViewportProfileIdFromWindow } from '@/lib/kassa-viewport-profile-id'

/** Zet lab-viewport (uit URL of sessie) vóór layout-meting; werk sessie bij. */
export function bootstrapKassaPosViewportDocument(): (() => void) | undefined {
  if (typeof window === 'undefined') return undefined
  const sp = mergedKassaPosSearchParams()
  const cleanup = applyKassaLayoutPreviewViewportFromSearchParams(sp)
  const profileId = readKassaViewportProfileIdFromWindow()
  persistKassaViewportProfileContext(profileId, sp)
  return cleanup
}

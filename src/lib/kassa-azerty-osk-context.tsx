'use client'

import { createContext, useContext } from 'react'

/** Reserve onderaan (zwevend paneel + marge) voor scroll-padding in modals. */
export const KASSA_AZERTY_OSK_HEIGHT_PX = 368

/** Scroll-reserve (≈ paneel + 10 cm breder dan basispaneel 760px). */
export const KASSA_AZERTY_OSK_MAX_WIDTH_PX = 1140

/** CSS-breedte zwevend paneel (basispaneel + 10 cm). */
export const KASSA_AZERTY_OSK_PANEL_WIDTH = 'min(96vw, calc(760px + 10cm))'

export const KASSA_AZERTY_OSK_PANEL_MIN_WIDTH = 'min(88vw, calc(520px + 10cm))'

export type KassaAzertyOskChrome = {
  visible: boolean
  heightPx: number
  dismiss: () => void
  manualToggleEnabled: boolean
  keyboardPinned: boolean
  toggleKeyboard: () => void
}

export const KassaAzertyOskContext = createContext<KassaAzertyOskChrome | null>(null)

export function useKassaAzertyOskChrome(): KassaAzertyOskChrome | null {
  return useContext(KassaAzertyOskContext)
}

'use client'

import { createContext, useContext } from 'react'

/** Reserve onderaan (zwevend paneel + marge) voor scroll-padding in modals. */
export const KASSA_AZERTY_OSK_HEIGHT_PX = 368

/** Zwevend paneel links — touch-vriendelijke breedte. */
export const KASSA_AZERTY_OSK_MAX_WIDTH_PX = 760

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

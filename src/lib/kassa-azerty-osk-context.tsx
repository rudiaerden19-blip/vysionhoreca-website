'use client'

import { createContext, useContext } from 'react'

/** Reserve voor scroll-padding + modals; compact paneel ~max 280px hoog. */
export const KASSA_AZERTY_OSK_HEIGHT_PX = 268

/** Toetsen niet over volle desktop-breedte. */
export const KASSA_AZERTY_OSK_MAX_WIDTH_PX = 560

export type KassaAzertyOskChrome = {
  visible: boolean
  heightPx: number
  dismiss: () => void
}

export const KassaAzertyOskContext = createContext<KassaAzertyOskChrome | null>(null)

export function useKassaAzertyOskChrome(): KassaAzertyOskChrome | null {
  return useContext(KassaAzertyOskContext)
}

'use client'

import { createContext, useContext } from 'react'

export const KASSA_AZERTY_OSK_HEIGHT_PX = 352

export type KassaAzertyOskChrome = {
  visible: boolean
  heightPx: number
  dismiss: () => void
}

export const KassaAzertyOskContext = createContext<KassaAzertyOskChrome | null>(null)

export function useKassaAzertyOskChrome(): KassaAzertyOskChrome | null {
  return useContext(KassaAzertyOskContext)
}

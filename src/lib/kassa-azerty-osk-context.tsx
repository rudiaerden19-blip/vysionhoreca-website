'use client'

import { createContext, useContext } from 'react'

/** Reserve onderaan (zwevend paneel + marge) voor scroll-padding in modals. */
export const KASSA_AZERTY_OSK_HEIGHT_PX = 318

/** Scroll-reserve (≈ paneel + 10 cm breder dan basispaneel 760px). */
/** Basispaneel + numpad (~180px). */
export const KASSA_AZERTY_OSK_MAX_WIDTH_PX = 1320

/** CSS-breedte zwevend paneel (basispaneel + 10 cm). */
export const KASSA_AZERTY_OSK_PANEL_WIDTH = 'min(96vw, calc(760px + 10cm))'

export const KASSA_AZERTY_OSK_PANEL_MIN_WIDTH = 'min(88vw, calc(520px + 10cm))'

/** Breedte één optie-knop (eigenaar: 3 cm). */
export const KASSA_AZERTY_OSK_OPTION_BTN_WIDTH = '3cm'

/** Numpad rechts: 2 kolommen × 3 cm + tussenruimte. */
export const KASSA_AZERTY_OSK_NUMPAD_WIDTH = 'calc(3cm * 2 + 0.35rem)'

/** Strip incl. scheidlijn-padding. */
export const KASSA_AZERTY_OSK_NUMPAD_STRIP_WIDTH = 'calc(3cm * 2 + 0.35rem + 0.65rem)'

export const KASSA_AZERTY_OSK_PANEL_WITH_NUMPAD_WIDTH = `min(96vw, calc(760px + 10cm + ${KASSA_AZERTY_OSK_NUMPAD_WIDTH}))`

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

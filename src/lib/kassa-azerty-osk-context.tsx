'use client'

import { createContext, useContext } from 'react'

/** Reserve onderaan (zwevend paneel + marge) voor scroll-padding in modals. */
export const KASSA_AZERTY_OSK_HEIGHT_PX = 298

/** Scroll-reserve (≈ paneel + numpad). */
export const KASSA_AZERTY_OSK_MAX_WIDTH_PX = 1320

/** CSS-breedte zwevend paneel (compact AZERTY-blok). */
export const KASSA_AZERTY_OSK_PANEL_WIDTH = 'min(94vw, calc(680px + 6cm))'

export const KASSA_AZERTY_OSK_PANEL_MIN_WIDTH = 'min(86vw, calc(460px + 6cm))'

/** Breedte één sneltekst / opmerking-veld (eigenaar: 4 cm). */
export const KASSA_AZERTY_OSK_OPTION_BTN_WIDTH = '4cm'

/** Numpad rechts: 2 kolommen + tussenruimte. */
export const KASSA_AZERTY_OSK_NUMPAD_WIDTH = `calc(${KASSA_AZERTY_OSK_OPTION_BTN_WIDTH} * 2 + 0.35rem)`

/** Strip incl. scheidlijn-padding. */
export const KASSA_AZERTY_OSK_NUMPAD_STRIP_WIDTH = `calc(${KASSA_AZERTY_OSK_NUMPAD_WIDTH} + 0.65rem)`

export const KASSA_AZERTY_OSK_PANEL_WITH_NUMPAD_WIDTH = `min(94vw, calc(680px + 6cm + ${KASSA_AZERTY_OSK_NUMPAD_WIDTH}))`

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

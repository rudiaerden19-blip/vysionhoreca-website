import type { PointerEvent as ReactPointerEvent } from 'react'

/** Witte invoer op plattegrond-modals — voorkomt zwart typvlak (kassa light/dark, color-scheme, autofill). */
export const KASSA_FLOOR_MODAL_INPUT_LIGHT =
  'vysion-light-form-field bg-white text-gray-900 placeholder:text-neutral-500 caret-gray-900 [color-scheme:light]'

export const KASSA_FLOOR_MODAL_TOUCH =
  'min-h-[44px] touch-manipulation [-webkit-tap-highlight-color:transparent]'

export function focusKassaFloorModalInput(e: ReactPointerEvent<HTMLInputElement>) {
  if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return
  e.currentTarget.focus({ preventScroll: true })
}

export function isFloorModalTextEntryFocused(): boolean {
  const ae = document.activeElement
  return (
    ae instanceof HTMLInputElement ||
    ae instanceof HTMLTextAreaElement ||
    ae instanceof HTMLSelectElement
  )
}

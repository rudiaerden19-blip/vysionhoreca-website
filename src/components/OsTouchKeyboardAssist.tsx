'use client'

import { useEffect } from 'react'

/** Velden waar we géén focus-/touch-fix toepassen. */
const DATA_OPT_OUT = 'data-no-os-touch-keyboard'

const IGNORE_INPUT_TYPES = new Set([
  'hidden',
  'file',
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'color',
  'range',
  'image',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
])

function isEligible(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el || !(el instanceof HTMLElement)) return false
  if (el.closest(`[${DATA_OPT_OUT}]`)) return false
  if (el instanceof HTMLTextAreaElement) {
    return !el.readOnly && !el.disabled
  }
  if (el instanceof HTMLInputElement) {
    if (el.readOnly || el.disabled) return false
    if (IGNORE_INPUT_TYPES.has(el.type)) return false
    return true
  }
  return false
}

/**
 * Edge/Chromium **VirtualKeyboard.show()** laat op sommige Windows-touch/Elo setups het **kleine
 * zwevende** systeemtoetsenbord verschijnen. We roepen die API daarom niet meer aan.
 *
 * Dit onderdeel zorgt er alleen nog voor dat touch/pen-tikken betrouwbaar **`focus`** op het
 * invoerveld krijgt — het OS mag daarna zijn normale (grotere/docke) keyboard kiezen.
 */
export function OsTouchKeyboardAssist() {
  useEffect(() => {
    const kickEligibleFocus = (el: HTMLInputElement | HTMLTextAreaElement) => {
      queueMicrotask(() => {
        try {
          if (document.activeElement !== el) {
            el.focus({ preventScroll: true })
          }
        } catch {
          /* noop */
        }
      })
    }

    /** Touch-eventpad (legacy). */
    const onTouchEnd = (ev: TouchEvent) => {
      const t = ev.target
      if (!isEligible(t)) return
      kickEligibleFocus(t)
    }

    /**
     * Edge/Windows gebruikt vaak Pointer Events; zonder focus-kick bereikt invoer soms geen caret.
     */
    const onPointerUp = (ev: PointerEvent) => {
      if (ev.pointerType !== 'touch' && ev.pointerType !== 'pen') return
      const t = ev.target
      if (!isEligible(t)) return
      kickEligibleFocus(t)
    }

    const touchEndOpts = { passive: true, capture: true } satisfies AddEventListenerOptions
    document.addEventListener('touchend', onTouchEnd, touchEndOpts)
    document.addEventListener('pointerup', onPointerUp, { capture: true })
    return () => {
      document.removeEventListener('touchend', onTouchEnd, touchEndOpts)
      document.removeEventListener('pointerup', onPointerUp, { capture: true })
    }
  }, [])

  return null
}

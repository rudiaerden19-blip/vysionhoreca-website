'use client'

import { useEffect } from 'react'

/** Velden waar we géén OS-/virtueel toetsenbord forceren. */
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

type NavVk = Navigator & {
  virtualKeyboard?: {
    overlaysContent?: boolean
    show?: () => void
  }
}

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

function tryShowOsKeyboard(nav: NavVk): void {
  try {
    nav.virtualKeyboard?.show?.()
  } catch {
    /* policy / browser-weigering — stil falen */
  }
}

/**
 * Windows-touch / kiosk (Edge Chromium): systeem-toetsenbord komt niet altijd automatisch naar boven na
 * onze verwijdering van het custom keyboard. Dit triggert de VirtualKeyboard API na focus waar ondersteund.
 * Geen deps; mag op elke tenant-pagina draaien.
 */
export function OsTouchKeyboardAssist() {
  useEffect(() => {
    const nav = navigator as NavVk
    const hasVk = typeof nav.virtualKeyboard?.show === 'function'

    if (hasVk) {
      try {
        nav.virtualKeyboard!.overlaysContent = true
      } catch {
        /* oudere builds */
      }
    }

    const afterFocusKick = () => {
      requestAnimationFrame(() => tryShowOsKeyboard(nav))
    }

    /** Touch → soms géén echte focus; daarna géén keyboard. Focus binnen microtask ná user gesture. */
    const onTouchEnd = (ev: TouchEvent) => {
      const t = ev.target
      if (!isEligible(t)) return
      const el = t
      queueMicrotask(() => {
        try {
          if (document.activeElement !== el) {
            el.focus({ preventScroll: true })
          }
        } catch {
          /* noop */
        }
        if (hasVk) tryShowOsKeyboard(nav)
      })
    }

    const onFocusIn = (ev: FocusEvent) => {
      const t = ev.target
      if (!isEligible(t)) return
      afterFocusKick()
    }

    document.addEventListener('focusin', onFocusIn, true)
    const touchEndOpts = { passive: true, capture: false } satisfies AddEventListenerOptions
    document.addEventListener('touchend', onTouchEnd, touchEndOpts)
    return () => {
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('touchend', onTouchEnd, touchEndOpts)
    }
  }, [])

  return null
}

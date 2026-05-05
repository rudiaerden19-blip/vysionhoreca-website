'use client'

import { useEffect, useRef, useState } from 'react'
import Keyboard from 'simple-keyboard'
import 'simple-keyboard/build/css/index.css'
import './touch-keyboard-overrides.css'

/** Zet localStorage `vysion_touch_keyboard_off` op "1" om het schermtoetsenbord uit te zetten (debug). */
const STORAGE_OFF = 'vysion_touch_keyboard_off'
/** Zet `vysion_force_touch_keyboard` op "1" om het altijd te tonen (b.v. testen op desktop). */
const STORAGE_FORCE = 'vysion_force_touch_keyboard'

function shouldOfferTouchKeyboard(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (localStorage.getItem(STORAGE_OFF) === '1') return false
    if (localStorage.getItem(STORAGE_FORCE) === '1') return true
  } catch {
    /* private mode */
  }
  if (navigator.maxTouchPoints > 0) return true
  if (window.matchMedia?.('(pointer: coarse)').matches) return true
  return false
}

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

const ATTR_KB_MANAGED = 'data-vysion-kb-managed'

function isEligibleInput(
  el: EventTarget | null,
): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el || !(el instanceof HTMLElement)) return false
  if (el.closest('[data-no-touch-keyboard]')) return false
  // Door ons readOnly + inputMode gezet om het systeemtoetsenbord te blokkeren
  if (el.getAttribute(ATTR_KB_MANAGED) === '1') {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      return !el.disabled
    }
    return false
  }
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

type SuppressedFieldState = { inputMode: string; readOnly: boolean }

const suppressedFieldState = new WeakMap<HTMLInputElement | HTMLTextAreaElement, SuppressedFieldState>()

function tryHideSystemVirtualKeyboard() {
  try {
    const nav = navigator as Navigator & { virtualKeyboard?: { hide?: () => void } }
    nav.virtualKeyboard?.hide?.()
  } catch {
    /* noop */
  }
}

/** Blokkeert Windows-/systeem-touchtoetsenbord; alleen het Vysion-schermtoetsenbord vult in. */
function suppressOsTouchKeyboard(el: HTMLInputElement | HTMLTextAreaElement) {
  if (suppressedFieldState.has(el)) return
  const inputMode =
    'inputMode' in el && typeof (el as HTMLInputElement).inputMode === 'string'
      ? (el as HTMLInputElement).inputMode
      : ''
  suppressedFieldState.set(el, { inputMode, readOnly: el.readOnly })
  el.setAttribute(ATTR_KB_MANAGED, '1')
  if ('inputMode' in el) {
    (el as HTMLInputElement).inputMode = 'none'
  }
  el.readOnly = true
  tryHideSystemVirtualKeyboard()
}

function restoreOsTouchKeyboard(el: HTMLInputElement | HTMLTextAreaElement | null) {
  if (!el) return
  const prev = suppressedFieldState.get(el)
  if (!prev) return
  suppressedFieldState.delete(el)
  el.removeAttribute(ATTR_KB_MANAGED)
  if ('inputMode' in el) {
    (el as HTMLInputElement).inputMode = prev.inputMode
  }
  el.readOnly = prev.readOnly
}

/** Sync waarde naar React-gecontroleerde velden (ook readOnly + controlled). */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

/** Basis sanitizer voor type="number" (Geen letters in de waarde string). */
function sanitizeNumberString(raw: string): string {
  const s = raw.replace(',', '.').replace(/[^\d.\-]/g, '')
  const parts = s.split('.')
  if (parts.length <= 2) return s
  return parts[0] + '.' + parts.slice(1).join('')
}

/**
 * Globaal schermtoetsenbord voor touch / kiosk (Windows-tablet zonder fysiek toetsenbord).
 * Staat in de root layout; focus op input/textarea opent het paneel onderaan.
 */
export function TouchScreenKeyboard() {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const keyboardRootRef = useRef<HTMLDivElement | null>(null)
  const keyboardRef = useRef<InstanceType<typeof Keyboard> | null>(null)
  const activeRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  /** Windows-touch: tik op toets geeft vaak focusout met relatedTarget=null — niet sluiten/i refocus. */
  const pointerOnKeyboardUntilMs = useRef(0)
  const [visible, setVisible] = useState(false)
  const [touchMode, setTouchMode] = useState(false)

  useEffect(() => {
    setTouchMode(shouldOfferTouchKeyboard())
  }, [])

  useEffect(() => {
    if (!touchMode) return
    const root = keyboardRootRef.current
    if (!root) return

    const kb = new Keyboard(root, {
      theme: 'hg-theme-default hg-layout-default',
      preventMouseDownDefault: true,
      preventMouseUpDefault: true,
      stopMouseDownPropagation: true,
      autoUseTouchEvents: true,
      newLineOnEnter: true,
      mergeDisplay: true,
      display: {
        '{bksp}': '⌫',
        '{enter}': '↵',
        '{shift}': '⇧',
        '{tab}': 'Tab',
        '{lock}': 'Caps',
        '{space}': '␣',
      },
      onChange: (str: string) => {
        const el = activeRef.current
        const inst = keyboardRef.current
        if (!el || !inst) return
        if (document.activeElement !== el) {
          try {
            el.focus({ preventScroll: true })
          } catch {
            /* noop */
          }
        }
        let out = str
        if (el instanceof HTMLInputElement && el.type === 'number') {
          out = sanitizeNumberString(str)
        }
        setNativeValue(el, out)
        requestAnimationFrame(() => {
          try {
            inst.setInput(el.value)
          } catch {
            /* noop */
          }
        })
      },
    })
    keyboardRef.current = kb

    const onFocusIn = (ev: FocusEvent) => {
      const t = ev.target
      if (!isEligibleInput(t)) {
        if (wrapRef.current?.contains(ev.target as Node)) return
        window.setTimeout(() => {
          const a = document.activeElement
          if (!isEligibleInput(a) && !wrapRef.current?.contains(a ?? null)) {
            setVisible(false)
            restoreOsTouchKeyboard(activeRef.current)
            activeRef.current = null
          }
        }, 0)
        return
      }
      suppressOsTouchKeyboard(t)
      activeRef.current = t
      const inst = keyboardRef.current
      if (!inst) return
      inst.setInput(t.value, undefined, true)
      const max = t.getAttribute('maxlength')
      if (max != null && max !== '') {
        const n = parseInt(max, 10)
        if (!Number.isNaN(n)) inst.setOptions({ maxLength: n })
      }
      setVisible(true)
    }

    const onFocusOut = (ev: FocusEvent) => {
      const t = ev.target
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return
      if (t.getAttribute(ATTR_KB_MANAGED) !== '1') return
      const related = ev.relatedTarget as Node | null
      if (wrapRef.current && related && wrapRef.current.contains(related)) {
        return
      }
      window.setTimeout(() => {
        if (Date.now() < pointerOnKeyboardUntilMs.current) {
          try {
            t.focus({ preventScroll: true })
          } catch {
            /* noop */
          }
          return
        }
        if (document.activeElement === t) return
        if (wrapRef.current?.contains(document.activeElement)) return
        if (activeRef.current === t) {
          activeRef.current = null
          setVisible(false)
        }
        restoreOsTouchKeyboard(t)
      }, 0)
    }

    const markDocPointer = (e: Event) => {
      const t = e.target
      if (t instanceof Node && wrapRef.current?.contains(t)) {
        pointerOnKeyboardUntilMs.current = Date.now() + 750
      }
    }
    document.addEventListener('pointerdown', markDocPointer, true)
    document.addEventListener('touchstart', markDocPointer, { capture: true, passive: true })

    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)

    return () => {
      document.removeEventListener('pointerdown', markDocPointer, true)
      document.removeEventListener('touchstart', markDocPointer, { capture: true } as AddEventListenerOptions)
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('focusout', onFocusOut, true)
      restoreOsTouchKeyboard(activeRef.current)
      kb.destroy()
      keyboardRef.current = null
    }
  }, [touchMode])

  if (!touchMode) return null

  return (
    <div
      ref={wrapRef}
      className={`vysion-touch-keyboard fixed inset-x-0 bottom-0 z-[99990] flex flex-col border-t border-gray-700 bg-gray-900/98 shadow-[0_-4px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm select-none ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      } transition-transform duration-200 ease-out`}
      aria-hidden={!visible}
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-700 px-2 py-1">
        <span className="text-xs font-semibold text-gray-300">Vysion toetsenbord</span>
        <button
          type="button"
          className="rounded px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const a = activeRef.current
            setVisible(false)
            if (a) {
              restoreOsTouchKeyboard(a)
              activeRef.current = null
              a.blur()
            }
          }}
        >
          Sluiten
        </button>
      </div>
      <div
        ref={keyboardRootRef}
        className="simple-keyboard-host max-h-[40vh] min-h-[200px] overflow-auto px-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1"
      />
    </div>
  )
}

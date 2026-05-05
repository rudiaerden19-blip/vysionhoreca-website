'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import Keyboard from 'simple-keyboard'
import 'simple-keyboard/build/css/index.css'
import './touch-keyboard-overrides.css'
import { ATTR_VYSION_KB_MANAGED, setNativeInputValue } from '@/lib/dom-input-value'
import { LAYOUT_AZERTY, LAYOUT_QWERTY } from './touch-keyboard-layouts'

const STORAGE_LAYOUT = 'vysion_touch_keyboard_layout'

/** Kassa/POS: altijd schermtoetsenbord (+ listeners), ook als het apparaat geen touch API meldt. */
function isShopAdminKassaPath(pathname: string | null): boolean {
  return typeof pathname === 'string' && pathname.includes('/admin/kassa')
}

function readSavedLayoutVariant(): 'qwerty' | 'azerty' {
  if (typeof window === 'undefined') return 'qwerty'
  try {
    const s = localStorage.getItem(STORAGE_LAYOUT)
    if (s === 'azerty' || s === 'qwerty') return s
  } catch {
    /* ignore */
  }
  return 'qwerty'
}

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
  if (window.matchMedia?.('(any-pointer: coarse)').matches) return true
  if (window.matchMedia?.('(hover: none)').matches) return true
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

function isEligibleInput(
  el: EventTarget | null,
): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el || !(el instanceof HTMLElement)) return false
  if (el.closest('[data-no-touch-keyboard]')) return false
  if (el.getAttribute(ATTR_VYSION_KB_MANAGED) === '1') {
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

/** Velden waarvoor we alleen het Vysion-toetsenbord markeren (geen inputMode-hacks — die breken sommige kiosks). */
const kbManagedFields = new WeakSet<HTMLInputElement | HTMLTextAreaElement>()

function tryHideSystemVirtualKeyboard() {
  try {
    const nav = navigator as Navigator & { virtualKeyboard?: { hide?: () => void } }
    nav.virtualKeyboard?.hide?.()
  } catch {
    /* noop */
  }
}

function suppressOsTouchKeyboard(el: HTMLInputElement | HTMLTextAreaElement) {
  if (kbManagedFields.has(el)) return
  kbManagedFields.add(el)
  el.setAttribute(ATTR_VYSION_KB_MANAGED, '1')
  tryHideSystemVirtualKeyboard()
}

function restoreOsTouchKeyboard(el: HTMLInputElement | HTMLTextAreaElement | null) {
  if (!el) return
  if (!kbManagedFields.has(el)) return
  kbManagedFields.delete(el)
  el.removeAttribute(ATTR_VYSION_KB_MANAGED)
}

function sanitizeNumberString(raw: string): string {
  const s = raw.replace(',', '.').replace(/[^\d.\-]/g, '')
  const parts = s.split('.')
  if (parts.length <= 2) return s
  return parts[0] + '.' + parts.slice(1).join('')
}

/**
 * Globaal schermtoetsenbord voor touch / kiosk.
 * Document-listeners staan los van simple-keyboard mount: als de host-ref één frame ontbreekt,
 * mogen focus/handler nooit volledig wegblijven (dat gaf “typt nergens iets”).
 */
export function TouchScreenKeyboard() {
  const pathname = usePathname()
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const keyboardRootRef = useRef<HTMLDivElement | null>(null)
  const keyboardRef = useRef<InstanceType<typeof Keyboard> | null>(null)
  const activeRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const pointerOnKeyboardUntilMs = useRef(0)
  const [layoutVariant, setLayoutVariant] = useState<'qwerty' | 'azerty'>(readSavedLayoutVariant)
  const [visible, setVisible] = useState(false)
  const [touchMode, setTouchMode] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_OFF) === '1') {
        setTouchMode(false)
        return
      }
    } catch {
      /* private mode */
    }
    const env = shouldOfferTouchKeyboard()
    const kassa = isShopAdminKassaPath(pathname)
    setTouchMode(env || kassa)
  }, [pathname])

  useLayoutEffect(() => {
    if (!touchMode) return

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
      if (inst) {
        inst.setInput(t.value, undefined, true)
        const max = t.getAttribute('maxlength')
        if (max != null && max !== '') {
          const n = parseInt(max, 10)
          if (!Number.isNaN(n)) inst.setOptions({ maxLength: n })
        }
      }
      setVisible(true)
    }

    const onFocusOut = (ev: FocusEvent) => {
      const t = ev.target
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return
      if (t.getAttribute(ATTR_VYSION_KB_MANAGED) !== '1') return
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

    let cancelled = false
    let raf = 0

    const mountKeyboard = () => {
      const onChange = (str: string) => {
        const el = activeRef.current
        if (!el) return
        const text = typeof str === 'string' ? str : String(str ?? '')
        if (document.activeElement !== el) {
          try {
            el.focus({ preventScroll: true })
          } catch {
            /* noop */
          }
        }
        let out = text
        if (el instanceof HTMLInputElement && el.type === 'number') {
          out = sanitizeNumberString(text)
        }
        setNativeInputValue(el, out)
        const inst = keyboardRef.current
        try {
          inst?.setInput(out, undefined, true)
        } catch {
          /* noop */
        }
      }

      const tryOnce = (attempt: number) => {
        if (cancelled) return
        const root = keyboardRootRef.current
        if (!root) {
          if (attempt < 50) {
            raf = requestAnimationFrame(() => tryOnce(attempt + 1))
          }
          return
        }
        const kb = new Keyboard(root, {
          theme: 'hg-theme-default hg-layout-default',
          layout: layoutVariant === 'azerty' ? LAYOUT_AZERTY : LAYOUT_QWERTY,
          layoutName: 'default',
          preventMouseDownDefault: true,
          preventMouseUpDefault: true,
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
          onChange,
        })
        keyboardRef.current = kb
        const el = activeRef.current
        if (el) {
          kb.setInput(el.value, undefined, true)
          const max = el.getAttribute('maxlength')
          if (max != null && max !== '') {
            const n = parseInt(max, 10)
            if (!Number.isNaN(n)) kb.setOptions({ maxLength: n })
          }
        }
      }

      tryOnce(0)
    }

    mountKeyboard()

    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      document.removeEventListener('pointerdown', markDocPointer, true)
      document.removeEventListener('touchstart', markDocPointer, { capture: true } as AddEventListenerOptions)
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('focusout', onFocusOut, true)
      restoreOsTouchKeyboard(activeRef.current)
      const kb = keyboardRef.current
      if (kb) {
        kb.destroy()
        keyboardRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- layoutVariant wordt via aparte effect op kb gezet (setOptions)
  }, [touchMode])

  useEffect(() => {
    if (!touchMode) return
    const kb = keyboardRef.current
    if (!kb) return
    kb.setOptions({
      layout: layoutVariant === 'azerty' ? LAYOUT_AZERTY : LAYOUT_QWERTY,
      layoutName: 'default',
    })
    const el = activeRef.current
    if (el) kb.setInput(el.value, undefined, true)
  }, [touchMode, layoutVariant])

  if (!touchMode) return null

  const panel = (
    <div
      ref={wrapRef}
      style={{ zIndex: 2147483646 }}
      className={`vysion-touch-keyboard fixed inset-x-0 bottom-0 flex flex-col border-t border-gray-700 bg-gray-900/98 shadow-[0_-4px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm select-none ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      } transition-transform duration-200 ease-out`}
      aria-hidden={!visible}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-700 px-2 py-1.5">
        <span className="text-xs font-semibold text-gray-300">Vysion toetsenbord</span>
        <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5 sm:justify-end">
          <span className="hidden text-[11px] text-gray-500 sm:inline">Indeling:</span>
          <button
            type="button"
            className={`touch-manipulation rounded-lg px-3 py-2 text-xs font-bold ${
              layoutVariant === 'qwerty'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setLayoutVariant('qwerty')
              try {
                localStorage.setItem(STORAGE_LAYOUT, 'qwerty')
              } catch {
                /* noop */
              }
            }}
          >
            QWERTY
          </button>
          <button
            type="button"
            className={`touch-manipulation rounded-lg px-3 py-2 text-xs font-bold ${
              layoutVariant === 'azerty'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setLayoutVariant('azerty')
              try {
                localStorage.setItem(STORAGE_LAYOUT, 'azerty')
              } catch {
                /* noop */
              }
            }}
          >
            AZERTY
          </button>
          <button
            type="button"
            className="touch-manipulation rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
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
      </div>
      <div
        ref={keyboardRootRef}
        className="simple-keyboard-host max-h-[40vh] min-h-[200px] overflow-auto px-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1"
      />
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(panel, document.body)
}

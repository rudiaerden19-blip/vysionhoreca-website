'use client'

import type { ReactNode } from 'react'

import { STAFF_PIN_MAX_LEN } from '@/components/staff-clock/StaffClockPinPortal'
import { useLanguage } from '@/i18n'
import { ATTR_VYSION_KB_MANAGED, focusInputForProgrammaticEdit, setNativeInputValue } from '@/lib/dom-input-value'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const IGNORE_TYPES = new Set([
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

const STORAGE_KEYBOARD_LAYOUT = 'vysion_web_kb_layout'

/** Blijft op het veld staan terwijl `inputmode` tijdelijk `none` is (decimale toetsen tonen). */
const ATTR_VYSION_KB_DECIMAL = 'data-vysion-kb-decimal'

type KeyboardLetterLayout = 'azerty' | 'qwerty'

function readStoredLetterLayout(): KeyboardLetterLayout {
  if (typeof window === 'undefined') return 'azerty'
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYBOARD_LAYOUT)
    return raw === 'qwerty' ? 'qwerty' : 'azerty'
  } catch {
    return 'azerty'
  }
}

function persistLetterLayout(layout: KeyboardLetterLayout) {
  try {
    window.localStorage.setItem(STORAGE_KEYBOARD_LAYOUT, layout)
  } catch {
    /* noop */
  }
}

const ADMIN_SCROLL_SELECTOR = '[data-vysion-admin-scroll]'

function findVerticalScrollParent(el: HTMLElement): HTMLElement {
  const kbOpen = document.documentElement.classList.contains('vysion-web-kb-open')
  if (kbOpen) {
    const kbHost = el.closest('[data-vysion-kb-scroll-host]')
    if (kbHost instanceof HTMLElement) return kbHost
  }

  const adminMain = el.closest(ADMIN_SCROLL_SELECTOR)
  if (adminMain instanceof HTMLElement) return adminMain

  let node: HTMLElement | null = el.parentElement
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node)
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight + 2
    ) {
      return node
    }
    node = node.parentElement
  }
  return document.documentElement
}

function scrollFieldClearOfKeyboard(target: HTMLElement, panelH: number, headerPx: number) {
  const margin = 16
  const visibleBottom = window.innerHeight - panelH - margin
  const rect = target.getBoundingClientRect()
  if (rect.bottom <= visibleBottom && rect.top >= headerPx + 8) return

  const scrollParent = findVerticalScrollParent(target)

  if (scrollParent === document.documentElement) {
    const y = window.scrollY + rect.top - headerPx - 20
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    window.scrollTo({ top: Math.min(maxScroll, Math.max(0, y)), behavior: 'smooth' })
    return
  }

  let delta = 0
  if (rect.bottom > visibleBottom) {
    delta = rect.bottom - visibleBottom + 12
  } else if (rect.top < headerPx + 8) {
    delta = rect.top - headerPx - 20
  }
  if (delta !== 0) {
    scrollParent.scrollTo({
      top: Math.max(0, scrollParent.scrollTop + delta),
      behavior: 'smooth',
    })
  }
}

/**
 * Zaak-shell + keuken + interne dashboards: altijd groot webtoetsenbord (kassa-/touch-pc stack).
 * Publieke landingspagina’s: vooral bij touch-/tablet-pointer.
 * Opslag: localStorage `vysion_web_kb_force` = 1 aan, `vysion_web_kb_off` = 1 uit.
 */
function shouldActivateWebKeyboard(pathname: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    if (localStorage.getItem('vysion_web_kb_off') === '1') return false
    if (localStorage.getItem('vysion_web_kb_force') === '1') return true
  } catch {
    /* noop */
  }

  const p = pathname || window.location.pathname

  if (/^\/shop\/[^/]+\//i.test(p)) return true
  if (/^\/keuken\//i.test(p)) return true
  if (/^\/(?:superadmin|dashboard|registreer)\b/i.test(p)) return true

  try {
    if (window.matchMedia?.('(pointer: coarse)')?.matches) return true
    if ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) return true
  } catch {
    /* noop */
  }

  return false
}

function isEligibleField(
  el: EventTarget | null,
  pathname: string,
): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el || !(el instanceof HTMLElement)) return false
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return false
  if (!shouldActivateWebKeyboard(pathname)) return false

  if (el.readOnly || el.disabled) return false
  if (el.closest('[data-no-web-touch-keyboard],[data-kassa-no-web-keyboard]'))
    return false

  if (el instanceof HTMLTextAreaElement) return true
  if (IGNORE_TYPES.has(el.type)) return false
  return true
}

function isNumericMode(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (el instanceof HTMLTextAreaElement) return false
  if (el.type === 'number') return true

  const im = (el.getAttribute('inputmode') || '').toLowerCase()
  if (im === 'numeric' || im === 'decimal') return true

  if (el.type === 'password') {
    const ml = typeof el.maxLength === 'number' && el.maxLength > 0 ? el.maxLength : 0
    if (ml > 0 && ml <= STAFF_PIN_MAX_LEN) return true
  }

  return false
}

/** id/name/autocomplete → losse tokens (camelCase, streepjes) voor “pin”-detectie zonder “pricing”-false positives. */
function normalizeFieldTokens(s: string): string {
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
}

function hintsPinNaming(el: HTMLInputElement): boolean {
  const id = normalizeFieldTokens(el.id || '')
  const name = normalizeFieldTokens(el.name || '')
  const ac = `${el.autocomplete ?? ''} ${el.getAttribute('autocomplete') ?? ''}`
  const blob = `${id} ${name} ${ac}`.toLowerCase()
  return /\b(pin|pincode|passcode|otp)\b/.test(blob) || /\bone-time-code\b/i.test(ac)
}

function isDigitOriented(el: HTMLInputElement): boolean {
  if (el.type === 'number' || el.type === 'tel') return true
  const im = (el.getAttribute('inputmode') || '').toLowerCase()
  if (im === 'numeric' || im === 'decimal') return true
  return false
}

/**
 * Compact PINATM-numpad: korte wachtwoordvelden, expliciete data-attribuut,
 * OTP, of velden met pin/pincode in id|name + cijferachtig type/modus.
 * `data-web-kb-pin="1"` op <input> of ancestor forceert compact numpad.
 */
function isCompactPinField(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (!(el instanceof HTMLInputElement)) return false

  try {
    if (el.closest('[data-web-kb-pin="1"]')) return true
  } catch {
    /* noop */
  }

  const ac = el.autocomplete ?? el.getAttribute('autocomplete') ?? ''
  if (/\bone-time-code\b/i.test(ac)) return true

  const ml = typeof el.maxLength === 'number' ? el.maxLength : 0

  if (el.type === 'password') {
    if (ml > 0 && ml <= STAFF_PIN_MAX_LEN) return true
    return hintsPinNaming(el)
  }

  if (!hintsPinNaming(el)) return false
  return isDigitOriented(el)
}

function numericAllowDecimal(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (!(el instanceof HTMLInputElement)) return false
  if (el.type === 'number') return true
  if (el.getAttribute(ATTR_VYSION_KB_DECIMAL) === '1') return true
  const im = (el.getAttribute('inputmode') || '').toLowerCase()
  return im === 'decimal'
}

function insertSnippet(el: HTMLInputElement | HTMLTextAreaElement, snippet: string): void {
  focusInputForProgrammaticEdit(el)
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? start
  const val = el.value
  const next = `${val.slice(0, start)}${snippet}${val.slice(end)}`

  try {
    setNativeInputValue(el, next)
  } catch {
    el.value = next
    try {
      el.dispatchEvent(new Event('input', { bubbles: true }))
    } catch {
      /* noop */
    }
  }

  const pos = start + snippet.length
  requestAnimationFrame(() => {
    try {
      el.setSelectionRange(pos, pos)
    } catch {
      /* noop */
    }
  })
}

function backspace(el: HTMLInputElement | HTMLTextAreaElement): void {
  focusInputForProgrammaticEdit(el)
  /** Bij null (sommige kiosk-browsers ná touch) invoegen net als insertSnippet: caret op einde tekst */
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? start
  const val = el.value

  let nextVal: string
  let caret: number

  if (start !== end) {
    nextVal = val.slice(0, start) + val.slice(end)
    caret = start
  } else if (start > 0) {
    nextVal = val.slice(0, start - 1) + val.slice(end)
    caret = start - 1
  } else {
    return
  }

  try {
    setNativeInputValue(el, nextVal)
  } catch {
    el.value = nextVal
    try {
      el.dispatchEvent(new Event('input', { bubbles: true }))
    } catch {
      /* noop */
    }
  }

  requestAnimationFrame(() => {
    try {
      el.setSelectionRange(caret, caret)
    } catch {
      /* noop */
    }
  })
}

function submitClosestForm(el: HTMLInputElement | HTMLTextAreaElement): void {
  const form = el.closest('form')
  if (!(form instanceof HTMLFormElement)) return
  try {
    if (typeof form.requestSubmit === 'function') form.requestSubmit()
  } catch {
    const btn = form.querySelector(
      'button[type="submit"]:not(:disabled)',
    ) as HTMLButtonElement | null
    btn?.click()
  }
}

type KeyBtnProps = {
  label: ReactNode
  onClick: () => void
  className?: string
  'aria-label'?: string
  title?: string
}

function KeyBtn({ label, onClick, className = '', 'aria-label': ariaLabel, title }: KeyBtnProps) {
  /** Touch via pointerevents; muisklik apart — géén dubbele touchEnd+pointerUp vuur */
  const touchConsumedRef = useRef(false)

  const run = () => {
    onClick()
  }

  return (
    <button
      type="button"
      tabIndex={-1}
      title={title}
      aria-label={ariaLabel}
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return
        e.preventDefault()
      }}
      onPointerUp={(e) => {
        if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return
        e.preventDefault()
        touchConsumedRef.current = true
        run()
        window.setTimeout(() => {
          touchConsumedRef.current = false
        }, 500)
      }}
      onMouseDown={(e) => {
        e.preventDefault()
      }}
      onClick={(e) => {
        e.preventDefault()
        if (touchConsumedRef.current) return
        run()
      }}
      className={`min-h-[48px] min-w-0 shrink-0 select-none rounded-[8px] border border-black/35 bg-[#474a54] px-0.5 text-lg font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] touch-manipulation active:bg-[#2f323b] active:brightness-105 max-sm:min-h-[52px] max-sm:text-[19px] sm:min-w-[48px] ${className}`.trim()}
    >
      {label}
    </button>
  )
}

export function WebAzertyKeyboard() {
  const pathname = usePathname() || ''
  const { t } = useLanguage()
  const [target, setTarget] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const [caps, setCaps] = useState(false)
  const [letterLayout, setLetterLayout] = useState<KeyboardLetterLayout>('azerty')
  const panelRef = useRef<HTMLDivElement>(null)

  const kbOn = shouldActivateWebKeyboard(pathname)

  useEffect(() => {
    setLetterLayout(readStoredLetterLayout())
  }, [])

  useEffect(() => {
    if (!kbOn) setTarget(null)
  }, [kbOn])

  const legacyNumericMode = !!(target && isNumericMode(target))
  const pinCompactMode = !!(target && isCompactPinField(target))
  const effectiveNumericKeyboard = legacyNumericMode || pinCompactMode
  const decimalsOk = !!(target && numericAllowDecimal(target) && !pinCompactMode)
  const pinOnly = !!(target && target instanceof HTMLInputElement && target.type === 'password')

  const handleFocusCapture = useCallback(
    (ev: FocusEvent) => {
      const tEl = ev.target
      if (!isEligibleField(tEl, pathname)) return
      setTarget(tEl)
      setCaps(false)
    },
    [pathname],
  )

  useEffect(() => {
    document.addEventListener('focusin', handleFocusCapture, true)
    return () => document.removeEventListener('focusin', handleFocusCapture, true)
  }, [handleFocusCapture])

  useEffect(() => {
    const onBlur = () => {
      queueMicrotask(() => {
        const active = document.activeElement
        if (active instanceof HTMLElement && panelRef.current?.contains(active)) return
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
          if (isEligibleField(active, pathname)) return
        }
        setTarget(null)
      })
    }

    document.addEventListener('focusout', onBlur, true)
    return () => document.removeEventListener('focusout', onBlur, true)
  }, [pathname])

  useLayoutEffect(() => {
    if (!target || !target.isConnected) return

    let prevInputmode: string | null = null
    let prevKbManaged: string | null = null
    let hadDecimalAttr = false
    try {
      if (target.hasAttribute('inputmode')) prevInputmode = target.getAttribute('inputmode')
      const im = (prevInputmode || '').toLowerCase()
      const wantsDecimal =
        target instanceof HTMLInputElement &&
        (target.type === 'number' || im === 'decimal' || target.getAttribute(ATTR_VYSION_KB_DECIMAL) === '1')
      if (wantsDecimal) {
        hadDecimalAttr = target.getAttribute(ATTR_VYSION_KB_DECIMAL) === '1'
        target.setAttribute(ATTR_VYSION_KB_DECIMAL, '1')
      }

      target.setAttribute('inputmode', 'none')

      prevKbManaged = target.getAttribute(ATTR_VYSION_KB_MANAGED)
      target.setAttribute(ATTR_VYSION_KB_MANAGED, '1')
    } catch {
      prevInputmode = null
      prevKbManaged = null
      hadDecimalAttr = false
    }

    const elCleanup = target
    return () => {
      if (!elCleanup.isConnected) return
      try {
        if (prevInputmode === null) elCleanup.removeAttribute('inputmode')
        else elCleanup.setAttribute('inputmode', prevInputmode)

        if (prevKbManaged === null) elCleanup.removeAttribute(ATTR_VYSION_KB_MANAGED)
        else elCleanup.setAttribute(ATTR_VYSION_KB_MANAGED, prevKbManaged)

        if (!hadDecimalAttr) elCleanup.removeAttribute(ATTR_VYSION_KB_DECIMAL)
      } catch {
        /* noop */
      }
    }
  }, [target])

  useLayoutEffect(() => {
    const root = document.documentElement
    if (!target) {
      root.classList.remove('vysion-web-kb-open')
      root.style.removeProperty('--vysion-web-kb-height')
      return
    }

    const syncKbInset = () => {
      const h = panelRef.current?.offsetHeight ?? 252
      root.classList.add('vysion-web-kb-open')
      root.style.setProperty('--vysion-web-kb-height', `${h}px`)
    }

    syncKbInset()
    requestAnimationFrame(syncKbInset)

    const ro =
      typeof ResizeObserver !== 'undefined' && panelRef.current
        ? new ResizeObserver(syncKbInset)
        : null
    if (ro && panelRef.current) ro.observe(panelRef.current)

    return () => {
      ro?.disconnect()
      root.classList.remove('vysion-web-kb-open')
      root.style.removeProperty('--vysion-web-kb-height')
    }
  }, [target, legacyNumericMode, pinCompactMode])

  useLayoutEffect(() => {
    if (!target || !target.isConnected) return
    const run = () => {
      try {
        const panelH = panelRef.current?.offsetHeight ?? 252
        scrollFieldClearOfKeyboard(target, panelH, 56)
      } catch {
        /* noop */
      }
    }
    requestAnimationFrame(run)
    requestAnimationFrame(() => requestAnimationFrame(run))
  }, [target, legacyNumericMode, pinCompactMode])

  const closePanel = () => {
    try {
      target?.blur()
    } catch {
      /* noop */
    }
    setTarget(null)
    setCaps(false)
  }

  const onChar = useCallback(
    (chRaw: string) => {
      if (!target || !target.isConnected) return

      /** Snelle invoer (.com, …) buiten numeriek-/PIN-blok */
      if (!effectiveNumericKeyboard && chRaw.length > 1) {
        insertSnippet(target, chRaw)
        return
      }

      const applyCase = (c: string) => {
        if (effectiveNumericKeyboard || !caps) return c
        if (/[a-z]/.test(c)) return c.toUpperCase()
        return c
      }

      if (!effectiveNumericKeyboard && caps && /[a-zA-Za-ž¿-ÿ]/.test(chRaw)) {
        queueMicrotask(() => setCaps(false))
      }

      if (effectiveNumericKeyboard) {
        if (chRaw === '.' || chRaw === ',') {
          if (!decimalsOk) return
          insertSnippet(target, '.')
          return
        }
        if (!/\d/.test(chRaw)) return
        insertSnippet(target, chRaw)
        return
      }

      insertSnippet(target, applyCase(chRaw))
    },
    [target, effectiveNumericKeyboard, caps, decimalsOk],
  )

  if (!kbOn || !target) return null

  /** AZERTY (BE PC) versus standaard QWERTY. */
  const AZERTY_ROW1 = ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']
  const AZERTY_ROW2 = ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm']
  const AZERTY_ROW3 = ['w', 'x', 'c', 'v', 'b', 'n']

  const QWERTY_ROW1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']
  const QWERTY_ROW2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l']
  const QWERTY_ROW3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm']

  const ROW1 = letterLayout === 'azerty' ? AZERTY_ROW1 : QWERTY_ROW1
  const ROW2 = letterLayout === 'azerty' ? AZERTY_ROW2 : QWERTY_ROW2
  const ROW3 = letterLayout === 'azerty' ? AZERTY_ROW3 : QWERTY_ROW3

  const rowPad2 =
    letterLayout === 'azerty'
      ? 'max-sm:pl-0.5 sm:pl-6 md:pl-10'
      : 'max-sm:pl-1 sm:pl-8 md:pl-12'
  const rowPad3 =
    letterLayout === 'azerty'
      ? 'max-sm:pl-0 sm:pl-5 md:pl-10'
      : 'max-sm:pl-0.5 sm:pl-6 md:pl-14'

  const chooseLayout = (L: KeyboardLetterLayout) => {
    setLetterLayout(L)
    persistLetterLayout(L)
  }

  const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

  const numericGrid = (
    <div className="mx-auto grid w-full max-w-[min(720px,92vw)] grid-cols-12 gap-x-1.5 gap-y-1.5 px-2 pb-2 pt-1 max-sm:gap-1.5 sm:gap-x-2 sm:gap-y-2 sm:px-3 sm:pb-2.5">
      {(['7', '8', '9'] as const).map((d) => (
        <KeyBtn key={d} label={d} className="col-span-3" onClick={() => onChar(d)} />
      ))}
      <KeyBtn
        label="⌫"
        className="col-span-3 bg-amber-900/95"
        onClick={() => {
          if (target?.isConnected) backspace(target)
        }}
      />
      {(['4', '5', '6'] as const).map((d) => (
        <KeyBtn key={d} label={d} className="col-span-3" onClick={() => onChar(d)} />
      ))}
      <KeyBtn
        label={t('kassaApp.webKbClear')}
        className="col-span-3 bg-red-900/85 text-white"
        onClick={() => {
          if (!target?.isConnected) return
          focusInputForProgrammaticEdit(target)
          try {
            setNativeInputValue(target, '')
          } catch {
            target.value = ''
            target.dispatchEvent(new Event('input', { bubbles: true }))
          }
        }}
      />
      {(['1', '2', '3'] as const).map((d) => (
        <KeyBtn key={d} label={d} className="col-span-3" onClick={() => onChar(d)} />
      ))}
      <KeyBtn
        label={t('kassaApp.webKbEnter')}
        className="col-span-3 bg-[#3C4D6B]"
        onClick={() => {
          if (!target?.isConnected) return
          focusInputForProgrammaticEdit(target)
          submitClosestForm(target)
        }}
      />
      {decimalsOk && !pinOnly ? (
        <>
          <KeyBtn label="," className="col-span-4" onClick={() => onChar(',')} />
          <KeyBtn label="0" className="col-span-4" onClick={() => onChar('0')} />
          <KeyBtn label="." className="col-span-4" onClick={() => onChar('.')} />
        </>
      ) : (
        <KeyBtn label="0" className="col-span-12" onClick={() => onChar('0')} />
      )}
    </div>
  )

  /** Compact ATM-stijl (PIN / OTP): minder breed en lager dan het grote numeriek rooster */
  const pinKeyCls =
    '!min-h-0 min-h-[40px] h-10 shrink-0 rounded-lg border border-black/35 bg-[#474a54] px-0 text-[17px] font-bold leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] touch-manipulation active:bg-[#2f323b] max-sm:min-h-[48px] max-sm:h-12 max-sm:text-[19px]'

  const pinCompactGrid = (
    <div className="mx-auto w-full max-w-[280px] px-3 pb-2.5 pt-1 sm:max-w-[300px]">
      {(
        [
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ] as const
      ).map((row) => (
        <div key={row.join('')} className="mb-1.5 grid grid-cols-3 gap-1.5">
          {row.map((d) => (
            <KeyBtn key={d} label={d} className={pinKeyCls} onClick={() => onChar(d)} />
          ))}
        </div>
      ))}
      <div className="grid grid-cols-3 gap-1.5">
        <KeyBtn
          label={t('kassaApp.webKbClear')}
          className={`${pinKeyCls} border-red-950/55 bg-[#682828] text-sm font-semibold leading-tight sm:text-[15px]`}
          onClick={() => {
            if (!target?.isConnected) return
            focusInputForProgrammaticEdit(target)
            try {
              setNativeInputValue(target, '')
            } catch {
              target.value = ''
              target.dispatchEvent(new Event('input', { bubbles: true }))
            }
          }}
        />
        <KeyBtn label="0" className={pinKeyCls} onClick={() => onChar('0')} />
        <KeyBtn
          label="⌫"
          className={`${pinKeyCls} border-amber-950/65 bg-[#5f3b28] text-xl`}
          onClick={() => {
            if (target?.isConnected) backspace(target)
          }}
        />
      </div>
      <KeyBtn
        label={t('kassaApp.webKbEnter')}
        className="mt-1.5 !min-h-0 min-h-[40px] w-full shrink-0 rounded-lg border-[#324160] bg-[#3f5380] py-2.5 text-sm font-bold sm:text-[15px]"
        onClick={() => {
          if (!target?.isConnected) return
          focusInputForProgrammaticEdit(target)
          submitClosestForm(target)
        }}
      />
    </div>
  )

  /** Telefoon: min-w-0 + flex-1 (één rij) met grotere toetsen. */
  const rowWrap =
    'mx-auto flex w-full max-w-[min(720px,92vw)] justify-stretch gap-1.5 px-2 max-sm:gap-1 max-sm:px-1.5 sm:gap-2 sm:px-2'

  const letterKeyCls =
    '!min-w-0 min-h-0 flex-[1_1_0] basis-0 px-0 py-0 font-semibold leading-none tracking-tight h-12 min-h-[48px] text-[17px] max-sm:h-[52px] max-sm:min-h-[52px] max-sm:text-[18px]'

  const digitKeyCls =
    '!min-w-0 min-h-0 flex-[1_1_0] basis-0 px-0 font-semibold leading-none h-12 min-h-[48px] text-[17px] max-sm:h-[52px] max-sm:min-h-[52px] max-sm:text-[18px]'

  const SYMBOL_KEY_COMPACT =
    'h-12 min-h-[48px] w-10 shrink-0 px-0 text-[16px] max-sm:h-[52px] max-sm:min-h-[52px] max-sm:w-11 max-sm:text-[17px] sm:w-11 sm:text-[16px]'

  const actionKeyCls =
    'h-12 min-h-[48px] max-sm:h-[52px] max-sm:min-h-[52px] max-sm:text-[16px] sm:min-h-[48px]'

  const letterBlock = (
    <div className="mx-auto w-full max-w-[min(720px,92vw)] select-none pb-2">
      <div className={`${rowWrap} pt-0.5`}>
        {DIGITS.map((d) => (
          <KeyBtn key={d} label={d} className={digitKeyCls} onClick={() => onChar(d)} />
        ))}
      </div>

      {/* Letterrijen (AZERTY of QWERTY) met trapjes */}
      <div className="mt-1 space-y-1.5 max-sm:space-y-1">
        <div className={`${rowWrap}`}>
          {ROW1.map((chr) => (
            <KeyBtn
              key={chr}
              label={caps ? chr.toUpperCase() : chr}
              className={letterKeyCls}
              onClick={() => onChar(chr)}
            />
          ))}
        </div>
        <div className={`${rowWrap} ${rowPad2}`}>
          {ROW2.map((chr) => (
            <KeyBtn
              key={chr}
              label={caps ? chr.toUpperCase() : chr}
              className={letterKeyCls}
              onClick={() => onChar(chr)}
            />
          ))}
        </div>
        <div className={`${rowWrap} ${rowPad3}`}>
          {ROW3.map((chr) => (
            <KeyBtn
              key={chr}
              label={caps ? chr.toUpperCase() : chr}
              className={letterKeyCls}
              onClick={() => onChar(chr)}
            />
          ))}
          <KeyBtn
            label="⌫"
            className={`!min-w-0 min-h-0 flex-[1.35_1_0] basis-0 shrink px-1 text-lg max-sm:px-0.5 sm:min-w-[3.5rem] sm:flex-none ${actionKeyCls}`}
            onClick={() => {
              if (target?.isConnected) backspace(target)
            }}
          />
        </div>

        {/* Eén onderrij: shift, tekens, spatiel met harde breedte-floor, enter — spaart hoogte t.o.v. twee rijen */}
        <div className="mx-auto flex w-full max-w-[min(720px,92vw)] flex-nowrap justify-start gap-1.5 overflow-x-auto px-1 pb-1 max-sm:gap-1 max-sm:px-1 sm:justify-center sm:gap-2 sm:overflow-x-visible sm:px-2 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]">
          <KeyBtn
            label="⇧"
            aria-label={t('kassaApp.webKbCaps')}
            title={t('kassaApp.webKbCaps')}
            className={`shrink-0 border-zinc-900 bg-[#585c66] px-2 text-xl font-bold leading-none max-sm:px-1.5 sm:min-w-[3.25rem] ${actionKeyCls} ${
              caps ? 'ring-[3px] ring-amber-400 ring-offset-0 ring-offset-transparent' : ''
            }`}
            onClick={() => {
              if (target?.isConnected) focusInputForProgrammaticEdit(target)
              setCaps((c) => !c)
            }}
          />
          {(['@', '-', '/', '€'] as const).map((s) => (
            <KeyBtn key={s} label={s} className={SYMBOL_KEY_COMPACT} onClick={() => onChar(s)} />
          ))}
          <KeyBtn label="_" className={SYMBOL_KEY_COMPACT} onClick={() => onChar('_')} />
          <KeyBtn label="." className={SYMBOL_KEY_COMPACT} onClick={() => onChar('.')} />
          <KeyBtn label="," className={SYMBOL_KEY_COMPACT} onClick={() => onChar(',')} />
          <KeyBtn label=":" className={SYMBOL_KEY_COMPACT} onClick={() => onChar(':')} />
          <KeyBtn label="&" className={SYMBOL_KEY_COMPACT} onClick={() => onChar('&')} />
          <KeyBtn label="'" className={SYMBOL_KEY_COMPACT} onClick={() => onChar("'")} />
          <KeyBtn
            label=".com"
            title={t('kassaApp.webKbDotComHint')}
            aria-label={t('kassaApp.webKbDotComHint')}
            className={`w-auto min-w-[2.75rem] shrink-0 px-1 text-xs font-bold tracking-tight max-sm:min-w-[2.5rem] max-sm:text-[13px] sm:min-w-[3rem] ${actionKeyCls}`}
            onClick={() => onChar('.com')}
          />
          {/* Geen flex-1 + min-w-0: daar klapte dit op 0 bij smalle wrappers — blokkeerde tikken */}
          <KeyBtn
            label={t('kassaApp.webKbSpace')}
            className={`max-sm:min-w-[4.5rem] min-w-[6.5rem] flex-1 basis-[clamp(5.5rem,26vw,18rem)] px-2 text-sm font-semibold tracking-wide max-sm:text-[13px] sm:min-w-[8rem] sm:px-3 ${actionKeyCls}`}
            onClick={() => onChar(' ')}
          />
          <KeyBtn
            label={t('kassaApp.webKbEnter')}
            className={`w-[min(5.5rem,calc((100vw-32px)*0.26))] shrink-0 border-[#324160] bg-[#3f5380] px-2 text-sm font-semibold max-sm:text-[13px] ${actionKeyCls}`}
            onClick={() => {
              if (!target?.isConnected) return
              focusInputForProgrammaticEdit(target)
              if (target instanceof HTMLTextAreaElement) insertSnippet(target, '\n')
              else submitClosestForm(target)
            }}
          />
        </div>
      </div>
    </div>
  )

  return (
    <div
      ref={panelRef}
      data-web-touch-keyboard-panel
      className="fixed bottom-0 left-1/2 z-[600] w-[min(720px,92vw)] max-w-[92vw] -translate-x-1/2 rounded-t-2xl border border-zinc-700 border-b-0 bg-[#151a21] px-0.5 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 shadow-[0_-8px_28px_rgba(0,0,0,.5)]"
      role="region"
      aria-label={
        pinCompactMode ? t('kassaApp.webKbPinTitle') : `${t('kassaApp.webKbTitle')} (${letterLayout.toUpperCase()})`
      }
    >
      <div className="flex w-full items-center gap-1.5 border-b border-zinc-800/80 px-1.5 py-0.5">
        {pinCompactMode ? (
          <p className="min-w-0 flex-1 truncate text-left text-[12px] font-semibold leading-tight text-zinc-200 sm:text-sm">
            {t('kassaApp.webKbPinTitle')}
          </p>
        ) : (
          <>
            <div
              role="group"
              aria-label={t('kassaApp.webKbLayoutGroupAria')}
              className="flex shrink-0 divide-x divide-zinc-600 overflow-hidden rounded-md border border-zinc-600"
            >
              <button
                type="button"
                tabIndex={-1}
                aria-pressed={letterLayout === 'azerty'}
                onPointerDown={(e) => {
                  if (e.pointerType === 'touch' || e.pointerType === 'pen') e.preventDefault()
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chooseLayout('azerty')}
                className={`h-8 min-w-[3.75rem] shrink-0 px-1.5 text-[10px] font-extrabold uppercase tracking-wide touch-manipulation active:brightness-110 sm:h-9 sm:min-w-[4.25rem] sm:text-[11px] ${
                  letterLayout === 'azerty' ? 'bg-[#3C4D6B] text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                AZERTY
              </button>
              <button
                type="button"
                tabIndex={-1}
                aria-pressed={letterLayout === 'qwerty'}
                onPointerDown={(e) => {
                  if (e.pointerType === 'touch' || e.pointerType === 'pen') e.preventDefault()
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chooseLayout('qwerty')}
                className={`h-8 min-w-[3.75rem] shrink-0 px-1.5 text-[10px] font-extrabold uppercase tracking-wide touch-manipulation active:brightness-110 sm:h-9 sm:min-w-[4.25rem] sm:text-[11px] ${
                  letterLayout === 'qwerty' ? 'bg-[#3C4D6B] text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                QWERTY
              </button>
            </div>
            <p className="min-w-0 flex-1 truncate text-center text-[11px] font-semibold leading-tight text-zinc-400 sm:text-xs">
              {t('kassaApp.webKbTitle')}
            </p>
          </>
        )}
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={closePanel}
          className="h-8 shrink-0 rounded-md bg-zinc-800 px-2.5 text-[11px] font-bold text-white touch-manipulation active:bg-zinc-950 sm:h-9 sm:text-xs"
        >
          {t('kassaApp.webKbClose')}
        </button>
      </div>

      {pinCompactMode ? pinCompactGrid : legacyNumericMode ? numericGrid : letterBlock}
    </div>
  )
}

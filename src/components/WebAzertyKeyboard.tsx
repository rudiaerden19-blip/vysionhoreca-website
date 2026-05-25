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

function numericAllowDecimal(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  return el instanceof HTMLInputElement && el.type === 'number'
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
  const start = el.selectionStart ?? 0
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
  /** Touch: sommige kiosks geven géén betrouwbare click na touchend; desktop: voorkom dubbele fire. */
  const touchConsumedRef = useRef(false)

  return (
    <button
      type="button"
      tabIndex={-1}
      title={title}
      aria-label={ariaLabel}
      onPointerDown={(e) => {
        e.preventDefault()
      }}
      onMouseDown={(e) => {
        e.preventDefault()
      }}
      onTouchEnd={(e) => {
        e.preventDefault()
        touchConsumedRef.current = true
        onClick()
        window.setTimeout(() => {
          touchConsumedRef.current = false
        }, 500)
      }}
      onClick={(e) => {
        e.preventDefault()
        if (touchConsumedRef.current) return
        onClick()
      }}
      className={`min-h-[44px] shrink-0 select-none rounded-[5px] border border-black/35 bg-[#474a54] px-1 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] touch-manipulation active:bg-[#2f323b] active:brightness-105 ${className}`.trim()}
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
  const panelRef = useRef<HTMLDivElement>(null)

  const kbOn = shouldActivateWebKeyboard(pathname)

  useEffect(() => {
    if (!kbOn) setTarget(null)
  }, [kbOn])

  const numericMode = !!(target && isNumericMode(target))
  const decimalsOk = !!(target && numericAllowDecimal(target))
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
    try {
      if (target.hasAttribute('inputmode')) prevInputmode = target.getAttribute('inputmode')
      target.setAttribute('inputmode', 'none')

      prevKbManaged = target.getAttribute(ATTR_VYSION_KB_MANAGED)
      target.setAttribute(ATTR_VYSION_KB_MANAGED, '1')
    } catch {
      prevInputmode = null
      prevKbManaged = null
    }

    const elCleanup = target
    return () => {
      if (!elCleanup.isConnected) return
      try {
        if (prevInputmode === null) elCleanup.removeAttribute('inputmode')
        else elCleanup.setAttribute('inputmode', prevInputmode)

        if (prevKbManaged === null) elCleanup.removeAttribute(ATTR_VYSION_KB_MANAGED)
        else elCleanup.setAttribute(ATTR_VYSION_KB_MANAGED, prevKbManaged)
      } catch {
        /* noop */
      }
    }
  }, [target])

  useLayoutEffect(() => {
    if (!target) return
    requestAnimationFrame(() => {
      try {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      } catch {
        /* noop */
      }
    })
  }, [target, numericMode])

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

      const applyCase = (c: string) => {
        if (numericMode || !caps) return c
        if (/[a-z]/.test(c)) return c.toUpperCase()
        return c
      }

      if (!numericMode && caps && /[a-zA-Za-ž¿-ÿ]/.test(chRaw)) {
        queueMicrotask(() => setCaps(false))
      }

      if (numericMode) {
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
    [target, numericMode, caps, decimalsOk],
  )

  if (!kbOn || !target) return null

  /** Belgian AZERTY (PC-indeling voor BE). */
  const ROW1 = ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']
  const ROW2 = ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm']
  const ROW3 = ['w', 'x', 'c', 'v', 'b', 'n']
  const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

  const numericGrid = (
    <div className="mx-auto grid max-w-xl grid-cols-12 gap-1.5 px-2 pb-3">
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

  /** Vaste kerneenheid zodat ingesprongen rijen lijken op een fysiek AZERTY-toetsenbord. */
  const letterKeyCls =
    'h-11 min-h-[44px] w-[2.4375rem] min-w-[2.4375rem] px-0 text-[17px] font-normal tracking-tight max-[380px]:h-10 max-[380px]:min-h-[40px] max-[380px]:w-[2rem] max-[380px]:min-w-[2rem] max-[380px]:text-[16px]'

  const SYMBOL_KEY =
    'h-11 min-h-[44px] w-[2rem] min-w-[2rem] px-0 text-[16px] max-[380px]:h-10 max-[380px]:min-h-[40px] max-[380px]:w-[1.75rem] max-[380px]:min-w-[1.75rem]'

  const letterBlock = (
    <div className="mx-auto w-full max-w-lg select-none pb-2 sm:max-w-[min(100%,36rem)]">
      <div className="flex justify-center gap-[5px] px-2 pt-1">
        {DIGITS.map((d) => (
          <KeyBtn key={d} label={d} className="h-10 min-h-10 w-9 px-0 text-[15px]" onClick={() => onChar(d)} />
        ))}
      </div>

      {/* AZERTY-letters in trapsgewijze rijen (zoals gebruikelijk op touchscreen-keyboards). */}
      <div className="mt-2 space-y-1.5 px-2">
        <div className="flex justify-center gap-[5px]">
          {ROW1.map((chr) => (
            <KeyBtn
              key={chr}
              label={caps ? chr.toUpperCase() : chr}
              className={letterKeyCls}
              onClick={() => onChar(chr)}
            />
          ))}
        </div>
        <div className="flex justify-center gap-[5px] pl-7 sm:pl-9 md:pl-10">
          {ROW2.map((chr) => (
            <KeyBtn
              key={chr}
              label={caps ? chr.toUpperCase() : chr}
              className={letterKeyCls}
              onClick={() => onChar(chr)}
            />
          ))}
        </div>
        <div className="flex items-center justify-center gap-[5px] pl-[1.6875rem] sm:pl-10 md:pl-[3.125rem]">
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
            className="h-11 min-h-[44px] w-[5rem] shrink-0 border-amber-950/70 bg-[#5f3b28] text-lg"
            onClick={() => {
              if (target?.isConnected) backspace(target)
            }}
          />
        </div>

        {/* Onder twee rijen zoals veel OS-touchkeyboards: interpunctie; daarna spatiel + enter. */}
        <div className="flex flex-wrap items-center justify-center gap-[5px] px-1">
          <KeyBtn
            label="⇧"
            aria-label={t('kassaApp.webKbCaps')}
            title={t('kassaApp.webKbCaps')}
            className={`h-11 min-h-[44px] w-[4.0625rem] shrink-0 border-zinc-900 bg-[#585c66] text-lg font-bold leading-none max-[380px]:h-10 max-[380px]:min-h-[40px] max-[380px]:w-[3.5rem] ${
              caps ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#151a21]' : ''
            }`}
            onClick={() => {
              if (target?.isConnected) focusInputForProgrammaticEdit(target)
              setCaps((c) => !c)
            }}
          />
          {(['@', '-', '/', '€'] as const).map((s) => (
            <KeyBtn key={s} label={s} className={SYMBOL_KEY} onClick={() => onChar(s)} />
          ))}
          <KeyBtn label="_" className={SYMBOL_KEY} onClick={() => onChar('_')} />
          <KeyBtn label="." className={SYMBOL_KEY} onClick={() => onChar('.')} />
          <KeyBtn label="," className={SYMBOL_KEY} onClick={() => onChar(',')} />
        </div>
        <div className="flex items-center gap-[5px] px-2 pt-1.5 pb-0.5 sm:mx-auto sm:max-w-[min(100%,28rem)]">
          <KeyBtn
            label={t('kassaApp.webKbSpace')}
            className="h-11 min-h-[44px] min-w-0 flex-1 text-[15px] font-semibold tracking-wide sm:text-base"
            onClick={() => onChar(' ')}
          />
          <KeyBtn
            label={t('kassaApp.webKbEnter')}
            className="h-11 min-h-[44px] w-[min(6.75rem,calc((100vw-52px)*0.34))] shrink-0 border-[#324160] bg-[#3f5380] px-3 text-[15px] font-semibold max-[380px]:h-10 max-[380px]:min-h-[40px]"
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
      data-web-azerty-keyboard-panel
      className="fixed inset-x-0 bottom-0 z-[600] border-t border-zinc-700 bg-[#151a21]/98 px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_28px_rgba(0,0,0,.45)] backdrop-blur-sm"
      role="region"
      aria-label={t('kassaApp.webKbTitle')}
    >
      <div className="mb-1 flex items-center justify-between gap-2 px-2">
        <p className="truncate text-xs font-semibold text-zinc-300">{t('kassaApp.webKbTitle')}</p>
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={closePanel}
          className="min-h-[40px] rounded-lg bg-zinc-800 px-3 text-sm font-bold text-white active:bg-zinc-950 touch-manipulation"
        >
          {t('kassaApp.webKbClose')}
        </button>
      </div>

      {numericMode ? numericGrid : letterBlock}
    </div>
  )
}

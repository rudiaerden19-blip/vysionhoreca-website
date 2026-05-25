'use client'

import type { ReactNode } from 'react'

import { STAFF_PIN_MAX_LEN } from '@/components/staff-clock/StaffClockPinPortal'
import { useLanguage } from '@/i18n'
import { setNativeInputValue } from '@/lib/dom-input-value'
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

type KeyBtnProps = { label: ReactNode; onClick: () => void; className?: string }

function KeyBtn({ label, onClick, className = '' }: KeyBtnProps) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onMouseDown={(e) => {
        e.preventDefault()
      }}
      onClick={onClick}
      className={`min-h-[48px] select-none rounded-lg bg-zinc-800 px-1 text-lg font-bold text-white shadow-sm active:bg-zinc-950 active:brightness-110 touch-manipulation ${className}`.trim()}
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

    let prev: string | null = null
    try {
      if (target.hasAttribute('inputmode')) prev = target.getAttribute('inputmode')
      target.setAttribute('inputmode', 'none')
    } catch {
      prev = null
    }

    const elCleanup = target
    return () => {
      if (!elCleanup.isConnected) return
      try {
        if (prev === null) elCleanup.removeAttribute('inputmode')
        else elCleanup.setAttribute('inputmode', prev)
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

  const letterBlock = (
    <>
      <div className="mx-auto flex max-w-5xl gap-1 px-2 pb-1">
        {DIGITS.map((d) => (
          <KeyBtn key={d} label={d} className="min-w-0 flex-1 min-h-[44px] text-base" onClick={() => onChar(d)} />
        ))}
      </div>

      <div className="mx-auto max-w-5xl space-y-1 px-2">
        <div className="grid grid-cols-10 gap-1">
          {ROW1.map((chr) => (
            <KeyBtn
              key={chr}
              label={caps ? chr.toUpperCase() : chr}
              className="min-h-[48px]"
              onClick={() => onChar(chr)}
            />
          ))}
        </div>

        <div className="grid grid-cols-10 gap-1">
          {ROW2.map((chr) => (
            <KeyBtn
              key={chr}
              label={caps ? chr.toUpperCase() : chr}
              className="min-h-[48px]"
              onClick={() => onChar(chr)}
            />
          ))}
        </div>

        <div className="flex gap-1">
          {ROW3.map((chr) => (
            <KeyBtn
              key={chr}
              label={caps ? chr.toUpperCase() : chr}
              className="min-h-[48px] flex-1"
              onClick={() => onChar(chr)}
            />
          ))}
          <KeyBtn
            label="⌫"
            className="h-[48px] min-h-[48px] w-[112px] flex-none shrink-0 bg-amber-900/95"
            onClick={() => {
              if (target?.isConnected) backspace(target)
            }}
          />
        </div>

        <div className="grid grid-cols-12 gap-1">
          <KeyBtn
            label={t('kassaApp.webKbCaps')}
            className={`col-span-12 min-h-[48px] bg-zinc-700 ${caps ? 'ring-2 ring-amber-400' : ''}`}
            onClick={() => setCaps((c) => !c)}
          />
        </div>

        <div className="grid grid-cols-12 gap-1 pb-2">
          <div className="col-span-12 flex gap-1 sm:col-span-6">
            {['@', '-', '_'].map((s) => (
              <KeyBtn key={s} label={s} className="min-h-[48px] flex-1" onClick={() => onChar(s)} />
            ))}
          </div>
          <div className="col-span-12 flex gap-1 sm:col-span-6">
            {['/', '€'].map((s) => (
              <KeyBtn key={s} label={s} className="min-h-[48px] flex-1" onClick={() => onChar(s)} />
            ))}
          </div>

          <KeyBtn
            label={t('kassaApp.webKbSpace')}
            className="col-span-12 min-h-[52px] text-base md:col-span-7"
            onClick={() => onChar(' ')}
          />
          <KeyBtn label="." className="col-span-6 min-h-[48px] md:col-span-2" onClick={() => onChar('.')} />
          <KeyBtn label="," className="col-span-6 min-h-[48px] md:col-span-3" onClick={() => onChar(',')} />
        </div>

        <div className="grid grid-cols-2 gap-1 pb-2">
          <KeyBtn
            label={t('kassaApp.webKbEnter')}
            className="min-h-[52px] bg-[#3C4D6B]"
            onClick={() => {
              if (!target?.isConnected) return
              if (target instanceof HTMLTextAreaElement) insertSnippet(target, '\n')
              else submitClosestForm(target)
            }}
          />
          <KeyBtn label={t('kassaApp.webKbClose')} className="min-h-[52px] bg-zinc-700" onClick={closePanel} />
        </div>
      </div>
    </>
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

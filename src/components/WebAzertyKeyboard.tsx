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
      className={`min-h-[40px] min-w-[44px] shrink-0 select-none rounded-[5px] border border-black/35 bg-[#474a54] px-1 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] touch-manipulation active:bg-[#2f323b] active:brightness-105 ${className}`.trim()}
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
        /** nearest + auto = minder “springen” waardoor het veld niet eindeloos tegen het blok duwt */
        target.scrollIntoView({ block: 'nearest', behavior: 'auto' })
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
    <div className="mx-auto grid max-w-[min(52rem,calc(100vw-24px))] grid-cols-12 gap-x-2 gap-y-2 px-3 pb-2 pt-1">
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
  /** Bredere rijen die meeschalen met schermbreedte; vaste maar niet te hoge tikhoogte. */
  const rowWrap = 'mx-auto flex w-full max-w-[min(92rem,calc(100vw-16px))] justify-center gap-1.5 px-2'

  const letterKeyCls =
    'h-10 min-h-[40px] flex-[1_1_0] min-w-[2.75rem] max-sm:min-w-[2.5rem] px-0 py-0 text-[17px] font-normal tracking-tight sm:text-[18px]'

  const SYMBOL_KEY_COMPACT =
    'h-10 min-h-[40px] w-10 shrink-0 px-0 text-[17px] sm:w-11 sm:text-[18px]'

  const letterBlock = (
    <div className="mx-auto w-full select-none pb-1.5">
      <div className={`${rowWrap} pt-0.5`}>
        {DIGITS.map((d) => (
          <KeyBtn
            key={d}
            label={d}
            className="h-10 min-h-[40px] flex-[1_1_0] min-w-10 max-sm:min-w-9 px-0 text-[16px] sm:text-[17px]"
            onClick={() => onChar(d)}
          />
        ))}
      </div>

      {/* AZERTY met trapjes; elk teken wordt breder op brede schermen */}
      <div className="mt-1 space-y-1">
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
        <div className={`${rowWrap} pl-8 sm:pl-10 md:pl-12`}>
          {ROW2.map((chr) => (
            <KeyBtn
              key={chr}
              label={caps ? chr.toUpperCase() : chr}
              className={letterKeyCls}
              onClick={() => onChar(chr)}
            />
          ))}
        </div>
        <div className={`${rowWrap} pl-6 sm:pl-10 md:pl-[3.25rem]`}>
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
            className="h-10 min-h-[40px] shrink-0 border-amber-950/70 bg-[#5f3b28] px-3 text-lg sm:min-w-[4.75rem]"
            onClick={() => {
              if (target?.isConnected) backspace(target)
            }}
          />
        </div>

        {/* Eén onderrij: shift, tekens, spatiel met harde breedte-floor, enter — spaart hoogte t.o.v. twee rijen */}
        <div className="mx-auto flex max-w-none min-w-full flex-nowrap justify-start gap-1.5 overflow-x-auto pb-1 px-2 sm:justify-center sm:overflow-x-visible [scrollbar-width:thin]">
          <KeyBtn
            label="⇧"
            aria-label={t('kassaApp.webKbCaps')}
            title={t('kassaApp.webKbCaps')}
            className={`h-10 min-h-[40px] shrink-0 border-zinc-900 bg-[#585c66] px-2 text-xl font-bold leading-none sm:min-w-[3.375rem] ${
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
          {/* Geen flex-1 + min-w-0: daar klapte dit op 0 bij smalle wrappers — blokkeerde tikken */}
          <KeyBtn
            label={t('kassaApp.webKbSpace')}
            className="h-10 min-h-[40px] max-sm:min-w-[7rem] min-w-[8.5rem] flex-1 basis-[clamp(10rem,36vw,24rem)] px-3 text-[15px] font-semibold tracking-wide sm:min-w-[9rem] sm:text-base"
            onClick={() => onChar(' ')}
          />
          <KeyBtn
            label={t('kassaApp.webKbEnter')}
            className="h-10 min-h-[40px] w-[min(6.5rem,calc((100vw-48px)*0.26))] shrink-0 border-[#324160] bg-[#3f5380] px-3 text-[15px] font-semibold"
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
      className="fixed inset-x-0 bottom-0 z-[600] overflow-hidden border-t border-zinc-700 bg-[#151a21]/98 px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 shadow-[0_-8px_28px_rgba(0,0,0,.45)] backdrop-blur-sm"
      role="region"
      aria-label={t('kassaApp.webKbTitle')}
    >
      {/* Groot watermerk achter de toetsen — geen pointer-events */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
      >
        <span className="-rotate-[8deg] select-none whitespace-nowrap py-2 text-[clamp(4rem,36vw,15rem)] font-black uppercase leading-none tracking-[0.42em] text-[#3C4D6B]/20 sm:text-[clamp(5.25rem,32vw,17.5rem)] md:text-[clamp(6rem,28vw,20rem)]">
          VYSION
        </span>
      </div>

      <div className="relative z-[1]">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 px-2 py-1">
          <p className="truncate text-[11px] font-semibold leading-tight text-zinc-400 sm:text-xs">
            {t('kassaApp.webKbTitle')}
          </p>
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={closePanel}
            className="h-9 shrink-0 rounded-md bg-zinc-800 px-3 text-xs font-bold text-white touch-manipulation active:bg-zinc-950 sm:h-10 sm:text-sm"
          >
            {t('kassaApp.webKbClose')}
          </button>
        </div>

        {numericMode ? numericGrid : letterBlock}
      </div>
    </div>
  )
}

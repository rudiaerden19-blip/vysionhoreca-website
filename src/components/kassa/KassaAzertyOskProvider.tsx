'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { getCurrentTenantSlug } from '@/lib/tenant-url'
import { useLanguage } from '@/i18n'
import {
  KASSA_AZERTY_LETTER_ROWS,
  KASSA_AZERTY_AT_CHAR,
  KASSA_AZERTY_NUMBER_ROW,
  applyKassaAzertyOskEdit,
  armKassaOskInput,
  disarmAllKassaOskInputs,
  disarmKassaOskInput,
  healOskBlockedTextField,
  isAzertyOskActiveForSession,
  releaseLegacyOskInputGuards,
  isKassaAzertyOskTextTarget,
  kassaAzertyKeyDisplay,
} from '@/lib/kassa-azerty-osk'
import { releaseAllOskScrollPadding } from '@/lib/scroll-input-above-keyboard'
import {
  KASSA_AZERTY_OSK_HEIGHT_PX,
  KassaAzertyOskContext,
} from '@/lib/kassa-azerty-osk-context'

function KassaAzertyOskProviderInner({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const routeParamTenant = typeof params?.tenant === 'string' ? params.tenant : undefined
  const [hostTenantSlug, setHostTenantSlug] = useState<string | null>(() =>
    typeof window !== 'undefined' ? getCurrentTenantSlug() : null,
  )

  useEffect(() => {
    setHostTenantSlug(getCurrentTenantSlug())
    releaseLegacyOskInputGuards()
    disarmAllKassaOskInputs()
  }, [pathname])

  const [visible, setVisible] = useState(false)
  const [shift, setShift] = useState(false)
  const activeRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const suppressedRef = useRef(false)
  const focusOutTimerRef = useRef<number | undefined>(undefined)

  const enabled = isAzertyOskActiveForSession({
    pathname,
    routeParamTenant,
    searchNext: searchParams?.get('next') ?? null,
    hostTenantSlug,
  })

  const hideKeyboard = useCallback((disarm: boolean) => {
    if (disarm) {
      if (activeRef.current) disarmKassaOskInput(activeRef.current)
      disarmAllKassaOskInputs()
      releaseLegacyOskInputGuards()
    }
    activeRef.current = null
    setVisible(false)
    setShift(false)
    releaseAllOskScrollPadding()
  }, [])

  const attachField = useCallback((el: HTMLInputElement | HTMLTextAreaElement) => {
    const prev = activeRef.current
    if (prev && prev !== el) disarmKassaOskInput(prev)
    suppressedRef.current = false
    healOskBlockedTextField(el)
    activeRef.current = el
    armKassaOskInput(el)
    setVisible(true)
  }, [])

  useEffect(() => {
    if (enabled) return
    hideKeyboard(true)
  }, [enabled, hideKeyboard])

  useEffect(() => {
    if (!enabled) return
    const active = document.activeElement
    if (!isKassaAzertyOskTextTarget(active)) return
    if (activeRef.current === active && visible) return
    attachField(active)
  }, [enabled, hostTenantSlug, pathname, attachField, visible])

  useEffect(() => {
    if (!enabled || !visible) {
      document.documentElement.style.paddingBottom = ''
      return
    }
    document.documentElement.style.paddingBottom = `${KASSA_AZERTY_OSK_HEIGHT_PX}px`
    return () => {
      document.documentElement.style.paddingBottom = ''
    }
  }, [enabled, visible])

  useEffect(() => {
    if (!enabled) return

    const clearFocusOutTimer = () => {
      if (focusOutTimerRef.current !== undefined) {
        window.clearTimeout(focusOutTimerRef.current)
        focusOutTimerRef.current = undefined
      }
    }

    const onFocusIn = (e: FocusEvent) => {
      if (!isKassaAzertyOskTextTarget(e.target)) return
      /** Na Toevoegen/Annuleren in opties-modal: opnieuw typen moet OSK weer openen. */
      suppressedRef.current = false
      clearFocusOutTimer()
      attachField(e.target)
    }

    const onFocusOut = (e: FocusEvent) => {
      const related = e.relatedTarget
      if (related instanceof Element && related.closest('[data-testid="kassa-azerty-osk"]')) {
        return
      }
      if (!(e.target instanceof HTMLElement) || !isKassaAzertyOskTextTarget(e.target)) {
        return
      }
      clearFocusOutTimer()
      focusOutTimerRef.current = window.setTimeout(() => {
        focusOutTimerRef.current = undefined
        const active = document.activeElement
        if (isKassaAzertyOskTextTarget(active)) {
          activeRef.current = active
          setVisible(true)
          return
        }
        const tracked = activeRef.current
        if (
          tracked?.isConnected &&
          !suppressedRef.current &&
          (active === document.body || active === document.documentElement)
        ) {
          setVisible(true)
          return
        }
        hideKeyboard(true)
      }, 300)
    }

    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
    return () => {
      clearFocusOutTimer()
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('focusout', onFocusOut, true)
      disarmAllKassaOskInputs()
    }
  }, [enabled, attachField, hideKeyboard])

  const dismissAzertyOsk = useCallback(() => {
    suppressedRef.current = true
    hideKeyboard(true)
    /** Kort onderdrukken na modal-sluit — geen vaste blur (blokkeerde 2e keer typen). */
    window.setTimeout(() => {
      suppressedRef.current = false
    }, 400)
  }, [hideKeyboard])

  const chromeValue = useMemo(
    () => ({
      visible: enabled && visible,
      heightPx: KASSA_AZERTY_OSK_HEIGHT_PX,
      dismiss: dismissAzertyOsk,
    }),
    [dismissAzertyOsk, enabled, visible],
  )

  const sendEdit = (edit: Parameters<typeof applyKassaAzertyOskEdit>[1]) => {
    const el = activeRef.current
    if (!el?.isConnected) return
    applyKassaAzertyOskEdit(el, edit)
  }

  const onKeyPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
  }

  const keyBtnClass =
    'min-h-[3.25rem] touch-manipulation select-none rounded-xl border border-neutral-500 bg-neutral-600 px-0.5 text-center text-xl font-bold text-white active:bg-neutral-500 sm:min-h-[3.5rem] sm:text-2xl'

  return (
    <KassaAzertyOskContext.Provider value={chromeValue}>
      {children}
      {enabled && visible && !suppressedRef.current ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-[480] border-t border-neutral-600 bg-neutral-800 px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]"
          role="region"
          aria-label={t('kassaApp.azertyOskTitle')}
          style={{ minHeight: KASSA_AZERTY_OSK_HEIGHT_PX, maxHeight: 'min(44vh, 380px)' }}
          data-testid="kassa-azerty-osk"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-300 sm:text-sm">
              {t('kassaApp.azertyOskTitle')}
            </span>
            <button
              type="button"
              className="touch-manipulation min-h-[2.75rem] min-w-[2.75rem] rounded-xl border border-neutral-500 bg-neutral-600 px-4 text-lg font-bold text-white active:bg-neutral-500"
              aria-label={t('kassaApp.azertyOskClose')}
              data-testid="kassa-azerty-osk-close"
              onClick={() => dismissAzertyOsk()}
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
              {KASSA_AZERTY_NUMBER_ROW.map((key) => (
                <button
                  key={`n-${key}`}
                  type="button"
                  className={keyBtnClass}
                  onPointerDown={onKeyPointerDown}
                  onClick={() => sendEdit({ char: kassaAzertyKeyDisplay(key, shift) })}
                >
                  {kassaAzertyKeyDisplay(key, shift)}
                </button>
              ))}
            </div>
            {KASSA_AZERTY_LETTER_ROWS.map((row, ri) => (
              <div
                key={`r-${ri}`}
                className="grid gap-1.5 sm:gap-2"
                style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
              >
                {row.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={keyBtnClass}
                    onPointerDown={onKeyPointerDown}
                    onClick={() => sendEdit({ char: kassaAzertyKeyDisplay(key, shift) })}
                  >
                    {kassaAzertyKeyDisplay(key, shift)}
                  </button>
                ))}
              </div>
            ))}
            <div className="grid grid-cols-[auto,auto,1fr,auto] gap-1.5 sm:gap-2">
              <button
                type="button"
                className={`${keyBtnClass} min-w-[3.25rem] px-3 sm:min-w-[3.5rem] ${shift ? 'border-neutral-300 bg-neutral-500' : ''}`}
                onPointerDown={onKeyPointerDown}
                onClick={() => setShift((s) => !s)}
              >
                ⇧
              </button>
              <button
                type="button"
                className={`${keyBtnClass} min-w-[3.25rem] px-2 sm:min-w-[3.5rem]`}
                onPointerDown={onKeyPointerDown}
                onClick={() => sendEdit({ char: KASSA_AZERTY_AT_CHAR })}
                data-testid="kassa-azerty-osk-at"
              >
                @
              </button>
              <button
                type="button"
                className={`${keyBtnClass} text-base`}
                onPointerDown={onKeyPointerDown}
                onClick={() => sendEdit('space')}
              >
                {' '}
              </button>
              <button
                type="button"
                className={`${keyBtnClass} min-w-[3.25rem] px-3 sm:min-w-[3.5rem]`}
                onPointerDown={onKeyPointerDown}
                onClick={() => sendEdit('backspace')}
              >
                ⌫
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </KassaAzertyOskContext.Provider>
  )
}

export function KassaAzertyOskProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <KassaAzertyOskProviderInner>{children}</KassaAzertyOskProviderInner>
    </Suspense>
  )
}

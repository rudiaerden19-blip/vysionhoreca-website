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
  isKassaAzertyOskManualOpenEnabled,
  KASSA_AZERTY_OSK_PILOT_SLUG,
  releaseLegacyOskInputGuards,
  resolveAzertyOskTenantSlug,
  isKassaAzertyOskTextTarget,
  kassaAzertyKeyDisplay,
} from '@/lib/kassa-azerty-osk'
import { releaseAllOskScrollPadding } from '@/lib/scroll-input-above-keyboard'
import {
  KASSA_AZERTY_OSK_HEIGHT_PX,
  KASSA_AZERTY_OSK_MAX_WIDTH_PX,
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
    setKeyboardPinned(false)
    setVisible(false)
  }, [pathname])

  const [visible, setVisible] = useState(false)
  const [keyboardPinned, setKeyboardPinned] = useState(false)
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

  const tenantSlugForOsk = useMemo(
    () =>
      resolveAzertyOskTenantSlug({
        pathname,
        routeParamTenant,
        searchNext: searchParams?.get('next') ?? null,
        hostTenantSlug,
      }) ?? KASSA_AZERTY_OSK_PILOT_SLUG,
    [hostTenantSlug, pathname, routeParamTenant, searchParams],
  )

  const manualOpen = enabled && isKassaAzertyOskManualOpenEnabled(tenantSlugForOsk)

  const showKeyboardPanel = enabled && visible && (!manualOpen || keyboardPinned)

  const hideKeyboard = useCallback((disarm: boolean) => {
    if (disarm) {
      if (activeRef.current) disarmKassaOskInput(activeRef.current)
      disarmAllKassaOskInputs()
      releaseLegacyOskInputGuards()
    }
    activeRef.current = null
    setVisible(false)
    setKeyboardPinned(false)
    setShift(false)
    releaseAllOskScrollPadding()
  }, [])

  const attachField = useCallback(
    (el: HTMLInputElement | HTMLTextAreaElement) => {
      const prev = activeRef.current
      if (prev && prev !== el) disarmKassaOskInput(prev)
      suppressedRef.current = false
      healOskBlockedTextField(el)
      activeRef.current = el
      armKassaOskInput(el)
      if (!manualOpen || keyboardPinned) {
        setVisible(true)
      }
    },
    [keyboardPinned, manualOpen],
  )

  useEffect(() => {
    if (enabled) return
    hideKeyboard(true)
  }, [enabled, hideKeyboard])

  useEffect(() => {
    if (!enabled || manualOpen) return
    const active = document.activeElement
    if (!isKassaAzertyOskTextTarget(active)) return
    if (activeRef.current === active && visible) return
    attachField(active)
  }, [enabled, hostTenantSlug, manualOpen, pathname, attachField, visible])

  useEffect(() => {
    if (!showKeyboardPanel) {
      document.documentElement.style.paddingBottom = ''
      return
    }
    document.documentElement.style.paddingBottom = `${KASSA_AZERTY_OSK_HEIGHT_PX}px`
    return () => {
      document.documentElement.style.paddingBottom = ''
    }
  }, [showKeyboardPanel])

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
      if (related instanceof Element && related.closest('[data-testid="kassa-azerty-osk-toggle"]')) {
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
          if (!manualOpen || keyboardPinned) setVisible(true)
          return
        }
        if (manualOpen && keyboardPinned) {
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
  }, [attachField, enabled, hideKeyboard, keyboardPinned, manualOpen])

  const dismissAzertyOsk = useCallback(() => {
    suppressedRef.current = true
    setVisible(false)
    releaseAllOskScrollPadding()
    if (!manualOpen) {
      hideKeyboard(true)
      window.setTimeout(() => {
        suppressedRef.current = false
      }, 400)
      return
    }
    /** Kort onderdrukken na modal-sluit — geen vaste blur (blokkeerde 2e keer typen). */
    window.setTimeout(() => {
      suppressedRef.current = false
      if (keyboardPinned) setVisible(true)
    }, 400)
  }, [hideKeyboard, keyboardPinned, manualOpen])

  const onToggleKeyboardPinned = useCallback(() => {
    if (keyboardPinned) {
      hideKeyboard(true)
      return
    }
    setKeyboardPinned(true)
    setVisible(true)
    const active = document.activeElement
    if (isKassaAzertyOskTextTarget(active)) {
      attachField(active)
    }
  }, [attachField, hideKeyboard, keyboardPinned])

  const chromeValue = useMemo(
    () => ({
      visible: showKeyboardPanel && !suppressedRef.current,
      heightPx: KASSA_AZERTY_OSK_HEIGHT_PX,
      dismiss: dismissAzertyOsk,
      manualToggleEnabled: manualOpen,
      keyboardPinned,
      toggleKeyboard: onToggleKeyboardPinned,
    }),
    [
      dismissAzertyOsk,
      keyboardPinned,
      manualOpen,
      onToggleKeyboardPinned,
      showKeyboardPanel,
    ],
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
    'min-h-[2.65rem] touch-manipulation select-none rounded-xl border border-neutral-500 bg-neutral-600 px-0.5 text-center text-base font-bold text-white active:bg-neutral-500 sm:min-h-[2.85rem] sm:text-lg'

  return (
    <KassaAzertyOskContext.Provider value={chromeValue}>
      {children}
      {showKeyboardPanel && !suppressedRef.current ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[480] flex justify-center px-3"
          role="presentation"
        >
          <div
            className="pointer-events-auto w-full min-w-0 rounded-2xl border border-neutral-600 bg-neutral-800/95 px-3 pb-2 pt-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md"
            role="region"
            aria-label={t('kassaApp.azertyOskTitle')}
            data-testid="kassa-azerty-osk"
            style={{ maxWidth: KASSA_AZERTY_OSK_MAX_WIDTH_PX }}
          >
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-300">
              {t('kassaApp.azertyOskTitle')}
            </span>
            <button
              type="button"
              className="touch-manipulation min-h-[2.25rem] min-w-[2.25rem] rounded-lg border border-neutral-500 bg-neutral-600 px-2.5 text-base font-bold text-white active:bg-neutral-500"
              aria-label={t('kassaApp.azertyOskClose')}
              data-testid="kassa-azerty-osk-close"
              onClick={() => hideKeyboard(true)}
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-10 gap-1.5">
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
                className="grid gap-1.5"
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
            <div className="grid grid-cols-[auto,auto,1fr,auto] gap-1.5">
              <button
                type="button"
                className={`${keyBtnClass} min-w-[2.75rem] px-2.5 sm:min-w-[3rem] ${shift ? 'border-neutral-300 bg-neutral-500' : ''}`}
                onPointerDown={onKeyPointerDown}
                onClick={() => setShift((s) => !s)}
              >
                ⇧
              </button>
              <button
                type="button"
                className={`${keyBtnClass} min-w-[2.75rem] px-2 sm:min-w-[3rem]`}
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
                className={`${keyBtnClass} min-w-[2.75rem] px-2.5 sm:min-w-[3rem]`}
                onPointerDown={onKeyPointerDown}
                onClick={() => sendEdit('backspace')}
              >
                ⌫
              </button>
            </div>
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

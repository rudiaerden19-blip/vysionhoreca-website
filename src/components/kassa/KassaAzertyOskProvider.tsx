'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { getTenantSettings, saveKassaOskLineShortcuts } from '@/lib/admin-api'
import { getCurrentTenantSlug } from '@/lib/tenant-url'
import { useLanguage } from '@/i18n'
import { KassaOskLineShortcutsPad } from '@/components/kassa/KassaOskLineShortcutsPad'
import {
  applyKassaOskLineShortcut,
  isKassaHorecaPosPath,
  isAdminOskNextFormField,
  isKassaOskLineNoteField,
  isKassaOskLineShortcutsEnabled,
  normalizeKassaOskLineShortcuts,
  shouldOpenAzertyOskForFieldFocus,
} from '@/lib/kassa-osk-line-shortcuts'
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
  releaseLegacyOskInputGuards,
  resolveAzertyOskTenantSlug,
  isKassaAzertyOskTextTarget,
  kassaAzertyKeyDisplay,
} from '@/lib/kassa-azerty-osk'
import { useKassaSpeelsDarkOskChrome } from '@/hooks/useKassaSpeelsDarkOskChrome'
import {
  KASSA_SPEELS_CHROME_MUTED_TEXT_CLASS,
  KASSA_SPEELS_MENU_PLATE_SHELL_BG_CLASS,
  KASSA_SPEELS_SIDEBAR_CART_VAK_CLASS,
  kassaSpeelsGrayChromeButtonClass,
} from '@/lib/kassa-pos-surface'
import {
  isEditableCatalogTextField,
  releaseAllOskScrollPadding,
  scheduleScrollInputAboveKeyboard,
} from '@/lib/scroll-input-above-keyboard'
import {
  KASSA_AZERTY_OSK_HEIGHT_PX,
  KASSA_AZERTY_OSK_PANEL_MIN_WIDTH,
  KASSA_AZERTY_OSK_PANEL_WIDTH,
  KASSA_AZERTY_OSK_PANEL_WITH_NUMPAD_WIDTH,
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

  const [visible, setVisible] = useState(false)
  const [keyboardPinned, setKeyboardPinned] = useState(false)
  const [lineNoteFieldActive, setLineNoteFieldActive] = useState(false)
  const [lineShortcutDraft, setLineShortcutDraft] = useState<string[]>(() =>
    normalizeKassaOskLineShortcuts([]),
  )
  const [shift, setShift] = useState(false)
  const activeRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const suppressedRef = useRef(false)
  const focusOutTimerRef = useRef<number | undefined>(undefined)
  const lineShortcutsLoadedRef = useRef(false)
  const lineShortcutsSaveTimerRef = useRef<number | undefined>(undefined)
  const lineShortcutsLastSavedRef = useRef('')

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
      }) ?? '',
    [hostTenantSlug, pathname, routeParamTenant, searchParams],
  )

  const manualOpen = enabled && isKassaAzertyOskManualOpenEnabled(tenantSlugForOsk)
  const lineShortcutsPilot =
    isKassaOskLineShortcutsEnabled(tenantSlugForOsk) && isKassaHorecaPosPath(pathname)
  const speelsDarkOsk = useKassaSpeelsDarkOskChrome(pathname)

  const showKeyboardPanel =
    enabled && visible && (!manualOpen || keyboardPinned || lineNoteFieldActive)
  const showLineShortcutsColumn =
    lineShortcutsPilot && showKeyboardPanel && !suppressedRef.current

  useEffect(() => {
    setHostTenantSlug(getCurrentTenantSlug())
    releaseLegacyOskInputGuards()
    disarmAllKassaOskInputs()
    setKeyboardPinned(false)
    setVisible(false)
    setLineNoteFieldActive(false)
  }, [pathname])

  useEffect(() => {
    if (!lineShortcutsPilot) return
    let cancelled = false
    lineShortcutsLoadedRef.current = false
    void getTenantSettings(tenantSlugForOsk).then((settings) => {
      if (cancelled) return
      const normalized = normalizeKassaOskLineShortcuts(settings?.kassa_osk_line_shortcuts)
      setLineShortcutDraft(normalized)
      lineShortcutsLastSavedRef.current = JSON.stringify(normalized)
      lineShortcutsLoadedRef.current = true
    })
    return () => {
      cancelled = true
    }
  }, [lineShortcutsPilot, tenantSlugForOsk])

  useEffect(() => {
    if (!lineShortcutsPilot || !lineShortcutsLoadedRef.current) return
    const normalized = normalizeKassaOskLineShortcuts(lineShortcutDraft)
    const payloadKey = JSON.stringify(normalized)
    if (payloadKey === lineShortcutsLastSavedRef.current) return

    if (lineShortcutsSaveTimerRef.current !== undefined) {
      window.clearTimeout(lineShortcutsSaveTimerRef.current)
    }
    lineShortcutsSaveTimerRef.current = window.setTimeout(() => {
      void saveKassaOskLineShortcuts(tenantSlugForOsk, normalized).then((result) => {
        if (result.ok) {
          lineShortcutsLastSavedRef.current = payloadKey
          setLineShortcutDraft(normalized)
        }
      })
    }, 700)

    return () => {
      if (lineShortcutsSaveTimerRef.current !== undefined) {
        window.clearTimeout(lineShortcutsSaveTimerRef.current)
      }
    }
  }, [lineShortcutDraft, lineShortcutsPilot, tenantSlugForOsk])

  const hideKeyboard = useCallback((disarm: boolean) => {
    if (disarm) {
      if (activeRef.current) disarmKassaOskInput(activeRef.current)
      disarmAllKassaOskInputs()
      releaseLegacyOskInputGuards()
    }
    activeRef.current = null
    setVisible(false)
    setKeyboardPinned(false)
    setLineNoteFieldActive(false)
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
      setLineNoteFieldActive(isKassaOskLineNoteField(el) || isAdminOskNextFormField(el))
      if (shouldOpenAzertyOskForFieldFocus(manualOpen, keyboardPinned, el)) {
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
      document.documentElement.style.removeProperty('--kassa-azerty-osk-reserve')
      return
    }
    document.documentElement.style.paddingBottom = `${KASSA_AZERTY_OSK_HEIGHT_PX}px`
    document.documentElement.style.setProperty(
      '--kassa-azerty-osk-reserve',
      `${KASSA_AZERTY_OSK_HEIGHT_PX}px`,
    )
    return () => {
      document.documentElement.style.paddingBottom = ''
      document.documentElement.style.removeProperty('--kassa-azerty-osk-reserve')
    }
  }, [showKeyboardPanel])

  useEffect(() => {
    if (!showKeyboardPanel) return
    const active = document.activeElement
    if (!isEditableCatalogTextField(active) && !isKassaAzertyOskTextTarget(active)) return
    return scheduleScrollInputAboveKeyboard(active)
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
      if (
        related instanceof Element &&
        related.closest('[data-testid="kassa-azerty-osk-shortcuts"]')
      ) {
        return
      }
      if (related instanceof Element && related.closest('[data-testid="kassa-options-modal"]')) {
        return
      }
      if (related instanceof Element && related.closest('[data-osk-next="true"]')) {
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
          if (shouldOpenAzertyOskForFieldFocus(manualOpen, keyboardPinned, active)) {
            setVisible(true)
          }
          return
        }
        if (manualOpen && (keyboardPinned || lineNoteFieldActive)) {
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
  }, [attachField, enabled, hideKeyboard, keyboardPinned, lineNoteFieldActive, manualOpen])

  const dismissAzertyOsk = useCallback(() => {
    suppressedRef.current = true
    hideKeyboard(true)
    window.setTimeout(() => {
      suppressedRef.current = false
    }, 400)
  }, [hideKeyboard])

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

  const insertLineShortcut = useCallback(
    (label: string) => {
      let el = activeRef.current
      if (!el?.isConnected || !isKassaOskLineNoteField(el)) {
        const found = document.querySelector(
          `[${'data-kassa-osk-line-note'}="true"]`,
        )
        if (found instanceof HTMLInputElement || found instanceof HTMLTextAreaElement) {
          el = found
          attachField(el)
        }
      }
      if (!el?.isConnected || !isKassaOskLineNoteField(el)) return
      applyKassaOskLineShortcut(el, label)
      el.focus()
    },
    [attachField],
  )

  const oskStretchToCart =
    lineShortcutsPilot && showLineShortcutsColumn && isKassaHorecaPosPath(pathname)

  const keyBtnClass = speelsDarkOsk
    ? `${kassaSpeelsGrayChromeButtonClass()} kassa-azerty-osk-key min-h-[3rem] px-0.5 text-center text-lg font-bold sm:min-h-[3.15rem] sm:text-xl`
    : 'kassa-azerty-osk-key min-h-[3rem] touch-manipulation select-none rounded-xl border border-neutral-500 bg-neutral-600 px-0.5 text-center text-lg font-bold text-white active:bg-neutral-500 sm:min-h-[3.15rem] sm:text-xl'

  const oskShellSpeels = `${KASSA_SPEELS_MENU_PLATE_SHELL_BG_CLASS} ${KASSA_SPEELS_SIDEBAR_CART_VAK_CLASS}`
  const oskPanelShell = speelsDarkOsk
    ? `${oskShellSpeels} shadow-[0_12px_40px_rgba(0,0,0,0.55)]`
    : 'border border-neutral-600 bg-neutral-800/95 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md'

  return (
    <KassaAzertyOskContext.Provider value={chromeValue}>
      {children}
      {showKeyboardPanel && !suppressedRef.current ? (
        <div
          className={`pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[480] left-[max(0.75rem,env(safe-area-inset-left))] ${
            oskStretchToCart ? 'kassa-azerty-osk-kassa-anchor' : 'max-w-[96vw]'
          }`}
          role="presentation"
        >
          <div
            className={`pointer-events-auto relative flex w-full flex-col rounded-2xl px-3.5 pb-2.5 pt-2 ${oskPanelShell}`}
            role="region"
            aria-label={t('kassaApp.azertyOskTitle')}
            data-testid="kassa-azerty-osk"
            style={
              oskStretchToCart
                ? undefined
                : {
                    width: showLineShortcutsColumn
                      ? KASSA_AZERTY_OSK_PANEL_WITH_NUMPAD_WIDTH
                      : KASSA_AZERTY_OSK_PANEL_WIDTH,
                    minWidth: KASSA_AZERTY_OSK_PANEL_MIN_WIDTH,
                    maxWidth: showLineShortcutsColumn
                      ? KASSA_AZERTY_OSK_PANEL_WITH_NUMPAD_WIDTH
                      : KASSA_AZERTY_OSK_PANEL_WIDTH,
                  }
            }
          >
            {!showLineShortcutsColumn ? (
              <button
                type="button"
                className={
                  speelsDarkOsk
                    ? 'absolute right-1.5 top-1.5 z-20 flex h-8 w-8 touch-manipulation items-center justify-center text-xl font-bold leading-none text-[#b0b0b0] active:opacity-80'
                    : 'absolute right-1.5 top-1.5 z-20 flex h-8 w-8 touch-manipulation items-center justify-center text-xl font-bold leading-none text-neutral-300 active:text-white'
                }
                aria-label={t('kassaApp.azertyOskClose')}
                data-testid="kassa-azerty-osk-close"
                onClick={() => hideKeyboard(true)}
              >
                ✕
              </button>
            ) : null}
          <div className="relative flex w-full items-start gap-0">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
            {showLineShortcutsColumn ? (
              <div className="mb-1 h-7 shrink-0" aria-hidden="true" data-testid="kassa-osk-keyboard-row-offset" />
            ) : null}
            <div className="grid grid-cols-10 gap-2">
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
                className="grid gap-2"
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
            <div className="grid grid-cols-[auto,auto,1fr,auto] gap-2">
              <button
                type="button"
                className={`${keyBtnClass} min-w-[3.25rem] px-3 sm:min-w-[3.5rem] ${shift && !speelsDarkOsk ? 'border-neutral-300 bg-neutral-500' : ''} ${shift && speelsDarkOsk ? 'brightness-110' : ''}`}
                onPointerDown={onKeyPointerDown}
                onClick={() => setShift((s) => !s)}
              >
                ⇧
              </button>
              <button
                type="button"
                className={`${keyBtnClass} min-w-[3.25rem] px-2.5 sm:min-w-[3.5rem]`}
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
          {showLineShortcutsColumn ? (
            <KassaOskLineShortcutsPad
              draft={lineShortcutDraft}
              speelsDark={speelsDarkOsk}
              kassaNumpad={oskStretchToCart}
              onClose={() => hideKeyboard(true)}
              onDraftChange={setLineShortcutDraft}
              onInsert={insertLineShortcut}
            />
          ) : null}
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

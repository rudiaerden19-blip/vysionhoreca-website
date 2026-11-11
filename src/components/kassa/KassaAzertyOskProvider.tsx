'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { getTenantSettings, saveKassaOskLineShortcuts } from '@/lib/admin-api'
import { focusInputForProgrammaticEdit } from '@/lib/dom-input-value'
import { flushSync } from 'react-dom'
import { getCurrentTenantSlug } from '@/lib/tenant-url'
import { useLanguage } from '@/i18n'
import { KassaOskLineShortcutsPad } from '@/components/kassa/KassaOskLineShortcutsPad'
import {
  applyKassaOskLineShortcut,
  findKassaOskLineNoteInput,
  isKassaHorecaPosPath,
  isAdminOskNextFormField,
  isKassaOskLineNoteField,
  isKassaOskShortcutSlotField,
  isKassaOskLineShortcutsEnabled,
  clampKassaOskLineShortcutDraft,
  normalizeKassaOskLineShortcuts,
  shouldOpenAzertyOskForFieldFocus,
} from '@/lib/kassa-osk-line-shortcuts'
import {
  KASSA_AZERTY_LETTER_ROWS,
  KASSA_AZERTY_AT_CHAR,
  KASSA_AZERTY_NUMBER_ROW,
  applyKassaAzertyOskEdit,
  nextKassaAzertyOskEditValue,
  seedKassaOskControlledFieldEditState,
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
  const shiftRef = useRef(false)
  const oskEditPointerRef = useRef<{ token: string; at: number } | null>(null)
  const lineShortcutDraftRef = useRef(lineShortcutDraft)
  const oskShortcutCaretRef = useRef<{ idx: number; caret: number } | null>(null)
  const activeRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const suppressedRef = useRef(false)
  const focusOutTimerRef = useRef<number | undefined>(undefined)
  const lineShortcutsLoadedRef = useRef(false)
  const lineShortcutsSaveTimerRef = useRef<number | undefined>(undefined)
  const lineShortcutsSaveSeqRef = useRef(0)
  const lineShortcutsLastSavedRef = useRef('')
  const lineShortcutsDirtyRef = useRef(false)
  const keyboardPinnedRef = useRef(keyboardPinned)
  keyboardPinnedRef.current = keyboardPinned
  const prevKeyboardPinnedRef = useRef(false)
  const [optionsModalOpen, setOptionsModalOpen] = useState(false)
  const optionsModalOpenRef = useRef(optionsModalOpen)
  optionsModalOpenRef.current = optionsModalOpen

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
  const lineShortcutsOnKassaPos =
    isKassaOskLineShortcutsEnabled(tenantSlugForOsk) && isKassaHorecaPosPath(pathname)
  const speelsDarkOsk = useKassaSpeelsDarkOskChrome(pathname)

  const showKeyboardPanel =
    enabled && visible && (!manualOpen || keyboardPinned || lineNoteFieldActive)
  const showLineShortcutsColumn =
    lineShortcutsOnKassaPos && showKeyboardPanel && !suppressedRef.current

  useEffect(() => {
    if (!lineShortcutsOnKassaPos || typeof document === 'undefined') return
    const syncOptionsModal = () => {
      setOptionsModalOpen(!!document.querySelector('[data-testid="kassa-options-modal"]'))
    }
    syncOptionsModal()
    const mo = new MutationObserver(syncOptionsModal)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [lineShortcutsOnKassaPos, showKeyboardPanel])

  useEffect(() => {
    setHostTenantSlug(getCurrentTenantSlug())
    releaseLegacyOskInputGuards()
    disarmAllKassaOskInputs()
    setKeyboardPinned(false)
    setVisible(false)
    setLineNoteFieldActive(false)
  }, [pathname])

  useEffect(() => {
    if (!lineShortcutsOnKassaPos) return
    let cancelled = false
    lineShortcutsLoadedRef.current = false
    void getTenantSettings(tenantSlugForOsk).then((settings) => {
      if (cancelled) return
      const normalized = normalizeKassaOskLineShortcuts(settings?.kassa_osk_line_shortcuts)
      lineShortcutsLoadedRef.current = true
      if (lineShortcutsDirtyRef.current || keyboardPinnedRef.current) return
      lineShortcutDraftRef.current = normalized
      setLineShortcutDraft(normalized)
      lineShortcutsLastSavedRef.current = JSON.stringify(normalized)
    })
    return () => {
      cancelled = true
    }
  }, [lineShortcutsOnKassaPos, tenantSlugForOsk])

  useEffect(() => {
    if (!lineShortcutsOnKassaPos || !lineShortcutsLoadedRef.current) return
    const apiPayload = normalizeKassaOskLineShortcuts(lineShortcutDraft)
    const payloadKey = JSON.stringify(apiPayload)
    if (payloadKey === lineShortcutsLastSavedRef.current) return

    const saveSeq = ++lineShortcutsSaveSeqRef.current

    if (lineShortcutsSaveTimerRef.current !== undefined) {
      window.clearTimeout(lineShortcutsSaveTimerRef.current)
    }
    lineShortcutsSaveTimerRef.current = window.setTimeout(() => {
      void saveKassaOskLineShortcuts(tenantSlugForOsk, apiPayload).then((result) => {
        if (!result.ok) return
        if (saveSeq !== lineShortcutsSaveSeqRef.current) return
        lineShortcutsLastSavedRef.current = payloadKey
      })
    }, 700)

    return () => {
      if (lineShortcutsSaveTimerRef.current !== undefined) {
        window.clearTimeout(lineShortcutsSaveTimerRef.current)
      }
    }
  }, [lineShortcutDraft, lineShortcutsOnKassaPos, tenantSlugForOsk])

  useEffect(() => {
    shiftRef.current = shift
  }, [shift])

  useEffect(() => {
    if (keyboardPinned) return
    lineShortcutDraftRef.current = lineShortcutDraft
  }, [keyboardPinned, lineShortcutDraft])

  const applyLineShortcutDraft = useCallback((next: string[]) => {
    lineShortcutDraftRef.current = next
    lineShortcutsDirtyRef.current = true
    setLineShortcutDraft(next)
  }, [])

  const clearFocusOutTimer = useCallback(() => {
    if (focusOutTimerRef.current !== undefined) {
      window.clearTimeout(focusOutTimerRef.current)
      focusOutTimerRef.current = undefined
    }
  }, [])

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
      if (isKassaOskShortcutSlotField(el)) {
        const slotIdx = Number(el.getAttribute('data-kassa-osk-shortcut-index'))
        if (Number.isFinite(slotIdx) && slotIdx >= 0) {
          const slotValue = lineShortcutDraftRef.current[slotIdx] ?? ''
          const caret = Math.min(el.selectionStart ?? slotValue.length, slotValue.length)
          oskShortcutCaretRef.current = { idx: slotIdx, caret }
          seedKassaOskControlledFieldEditState(el, slotValue, caret)
        }
      } else {
        seedKassaOskControlledFieldEditState(el)
      }
      setLineNoteFieldActive(
        isKassaOskLineNoteField(el) ||
          isAdminOskNextFormField(el) ||
          isKassaOskShortcutSlotField(el),
      )
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
  }, [
    attachField,
    clearFocusOutTimer,
    enabled,
    hideKeyboard,
    keyboardPinned,
    lineNoteFieldActive,
    manualOpen,
  ])

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
    const optionsOpen = !!document.querySelector('[data-testid="kassa-options-modal"]')
    if (
      optionsOpen &&
      active instanceof HTMLInputElement &&
      isKassaOskLineNoteField(active)
    ) {
      attachField(active)
      return
    }
    setLineNoteFieldActive(false)
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      if (isKassaOskShortcutSlotField(active)) {
        attachField(active)
        return
      }
      if (isKassaAzertyOskTextTarget(active) && !isKassaOskLineNoteField(active)) {
        attachField(active)
        return
      }
    }
    window.requestAnimationFrame(() => {
      const first = document.querySelector('[data-kassa-osk-shortcut-slot="true"]')
      if (first instanceof HTMLInputElement) attachField(first)
    })
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

  /** Potlood/productmodal: invul-knoppen. Blauw Toetsenbord vast + géén modal: tekstvelden bewerken. */
  const shortcutSlotsEditable = keyboardPinned && !optionsModalOpen

  const preferOskLineNoteTarget = lineShortcutsOnKassaPos && !shortcutSlotsEditable

  useEffect(() => {
    const justPinned = keyboardPinned && !prevKeyboardPinnedRef.current
    prevKeyboardPinnedRef.current = keyboardPinned
    if (!justPinned || optionsModalOpen || !showLineShortcutsColumn) return
    const id = window.requestAnimationFrame(() => {
      const active = document.activeElement
      if (isKassaOskShortcutSlotField(active)) return
      const first = document.querySelector('[data-kassa-osk-shortcut-slot="true"]')
      if (first instanceof HTMLInputElement) attachField(first)
    })
    return () => window.cancelAnimationFrame(id)
  }, [attachField, keyboardPinned, optionsModalOpen, showLineShortcutsColumn])

  const pickOskEditTarget = useCallback(
    (candidate: HTMLInputElement | HTMLTextAreaElement | null | undefined) => {
      if (!candidate?.isConnected || !isKassaAzertyOskTextTarget(candidate)) return null
      if (preferOskLineNoteTarget && isKassaOskShortcutSlotField(candidate)) return null
      return candidate
    },
    [preferOskLineNoteTarget],
  )

  const resolveOskEditTarget = useCallback((): HTMLInputElement | HTMLTextAreaElement | null => {
    const tracked = pickOskEditTarget(activeRef.current)
    if (tracked) return tracked

    if (shortcutSlotsEditable) {
      const armedSlot = document.querySelector(
        '[data-kassa-osk-shortcut-slot="true"][data-kassa-osk-armed="true"]',
      )
      if (armedSlot instanceof HTMLInputElement) {
        const picked = pickOskEditTarget(armedSlot)
        if (picked) {
          activeRef.current = picked
          return picked
        }
      }
      const slots = document.querySelectorAll('input[data-kassa-osk-shortcut-slot="true"]')
      for (const node of slots) {
        if (!(node instanceof HTMLInputElement)) continue
        const picked = pickOskEditTarget(node)
        if (picked) {
          activeRef.current = picked
          armKassaOskInput(picked)
          return picked
        }
      }
    }

    if (preferOskLineNoteTarget) {
      const line = findKassaOskLineNoteInput(null)
      if (line) {
        activeRef.current = line
        return line
      }
    }

    const active = document.activeElement
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      const picked = pickOskEditTarget(active)
      if (picked) {
        activeRef.current = picked
        return picked
      }
    }

    const armed = document.querySelector('[data-kassa-osk-armed="true"]')
    if (armed instanceof HTMLInputElement || armed instanceof HTMLTextAreaElement) {
      const picked = pickOskEditTarget(armed)
      if (picked) {
        activeRef.current = picked
        return picked
      }
    }
    return null
  }, [pickOskEditTarget, preferOskLineNoteTarget, shortcutSlotsEditable])

  const sendEdit = useCallback(
    (edit: Parameters<typeof applyKassaAzertyOskEdit>[1]) => {
      const el = resolveOskEditTarget()
      if (!el?.isConnected) return
      focusInputForProgrammaticEdit(el)

      const editShortcutSlot =
        el instanceof HTMLInputElement &&
        isKassaOskShortcutSlotField(el) &&
        keyboardPinnedRef.current &&
        !optionsModalOpenRef.current

      if (editShortcutSlot) {
        const idx = Number(el.getAttribute('data-kassa-osk-shortcut-index'))
        if (!Number.isFinite(idx) || idx < 0) return
        const draft = lineShortcutDraftRef.current
        const value = draft[idx] ?? ''
        const caretStart =
          oskShortcutCaretRef.current?.idx === idx
            ? oskShortcutCaretRef.current.caret
            : Math.min(el.selectionStart ?? value.length, value.length)
        const max = el.maxLength > 0 ? el.maxLength : undefined
        const result = nextKassaAzertyOskEditValue(
          value,
          { start: caretStart, end: caretStart },
          edit,
          max,
        )
        if (!result) return
        const clamped = clampKassaOskLineShortcutDraft(result.next)
        const caret = Math.min(result.caret, clamped.length)
        const nextDraft = [...draft]
        nextDraft[idx] = clamped
        lineShortcutDraftRef.current = nextDraft
        oskShortcutCaretRef.current = { idx, caret }
        seedKassaOskControlledFieldEditState(el, clamped, caret)
        lineShortcutsDirtyRef.current = true
        flushSync(() => applyLineShortcutDraft(nextDraft))
        try {
          el.setSelectionRange(caret, caret)
        } catch {
          /* noop */
        }
      } else {
        applyKassaAzertyOskEdit(el, edit)
      }

      activeRef.current = el
      armKassaOskInput(el)
    },
    [applyLineShortcutDraft, resolveOskEditTarget],
  )

  const [pressedOskKey, setPressedOskKey] = useState<string | null>(null)

  useEffect(() => {
    if (!pressedOskKey) return
    const release = () => setPressedOskKey(null)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    return () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
    }
  }, [pressedOskKey])

  const pressOskKey = useCallback((token: string) => {
    setPressedOskKey(token)
  }, [])

  const makeOskEditKeyHandlers = useCallback(
    (token: string, getEdit: () => Parameters<typeof applyKassaAzertyOskEdit>[1]) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()
        clearFocusOutTimer()
        pressOskKey(token)
        oskEditPointerRef.current = { token, at: Date.now() }
        sendEdit(getEdit())
      },
      onClick: (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const pd = oskEditPointerRef.current
        if (pd?.token === token && Date.now() - pd.at < 320) return
        clearFocusOutTimer()
        pressOskKey(token)
        sendEdit(getEdit())
      },
    }),
    [clearFocusOutTimer, pressOskKey, sendEdit],
  )

  const shiftKeyHandlers = useMemo(
    () => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()
        pressOskKey('shift')
        oskEditPointerRef.current = { token: 'shift', at: Date.now() }
        setShift((s) => !s)
      },
      onClick: (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const pd = oskEditPointerRef.current
        if (pd?.token === 'shift' && Date.now() - pd.at < 320) return
        pressOskKey('shift')
        setShift((s) => !s)
      },
    }),
    [pressOskKey],
  )

  const insertLineShortcut = useCallback(
    (label: string) => {
      const trimmed = label.trim()
      if (!trimmed) return
      const el = findKassaOskLineNoteInput(activeRef.current)
      if (!el?.isConnected || !isKassaOskLineNoteField(el)) return
      focusInputForProgrammaticEdit(el)
      applyKassaOskLineShortcut(el, trimmed)
      attachField(el)
    },
    [attachField],
  )

  const oskStretchToCart =
    lineShortcutsOnKassaPos && showLineShortcutsColumn && isKassaHorecaPosPath(pathname)

  const keyBtnClass = speelsDarkOsk
    ? `${kassaSpeelsGrayChromeButtonClass()} kassa-azerty-osk-key min-h-[2.75rem] px-0.5 text-center text-base font-bold sm:min-h-[2.9rem] sm:text-lg`
    : 'kassa-azerty-osk-key min-h-[2.75rem] touch-manipulation select-none rounded-xl border border-neutral-500 bg-neutral-600 px-0.5 text-center text-base font-bold text-white active:bg-neutral-500 sm:min-h-[2.9rem] sm:text-lg'

  const keyBtnClassFor = useCallback(
    (token: string, extra = '') =>
      [
        keyBtnClass,
        extra,
        pressedOskKey === token ? 'kassa-azerty-osk-key--pressed' : '',
      ]
        .filter(Boolean)
        .join(' '),
    [keyBtnClass, pressedOskKey],
  )

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
            className={`pointer-events-auto relative flex w-full flex-col rounded-2xl px-3 pb-2 pt-1.5 ${oskPanelShell}`}
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
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {showLineShortcutsColumn ? (
              <div className="mb-0.5 h-7 shrink-0" aria-hidden="true" data-testid="kassa-osk-keyboard-row-offset" />
            ) : null}
            <div className="grid grid-cols-10 gap-1.5">
              {KASSA_AZERTY_NUMBER_ROW.map((key) => (
                <button
                  key={`n-${key}`}
                  type="button"
                  className={keyBtnClassFor(`n:${key}`)}
                  {...makeOskEditKeyHandlers(`n:${key}`, () => ({
                    char: kassaAzertyKeyDisplay(key, shiftRef.current),
                  }))}
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
                    className={keyBtnClassFor(`l:${key}`)}
                    {...makeOskEditKeyHandlers(`l:${key}`, () => ({
                      char: kassaAzertyKeyDisplay(key, shiftRef.current),
                    }))}
                  >
                    {kassaAzertyKeyDisplay(key, shift)}
                  </button>
                ))}
              </div>
            ))}
            <div className="grid grid-cols-[auto,auto,1fr,auto] gap-1.5">
              <button
                type="button"
                className={keyBtnClassFor(
                  'shift',
                  `min-w-[2.85rem] px-2.5 sm:min-w-[3rem] ${shift && !speelsDarkOsk ? 'border-neutral-300 bg-neutral-500' : ''} ${shift && speelsDarkOsk ? 'brightness-110' : ''}`,
                )}
                {...shiftKeyHandlers}
              >
                ⇧
              </button>
              <button
                type="button"
                className={keyBtnClassFor('at', 'min-w-[2.85rem] px-2 sm:min-w-[3rem]')}
                {...makeOskEditKeyHandlers('at', () => ({ char: KASSA_AZERTY_AT_CHAR }))}
                data-testid="kassa-azerty-osk-at"
              >
                @
              </button>
              <button
                type="button"
                className={keyBtnClassFor('space', 'text-base tracking-widest text-neutral-300')}
                {...makeOskEditKeyHandlers('space', () => 'space')}
                data-testid="kassa-azerty-osk-space"
                aria-label={t('kassaApp.azertyOskSpace')}
              >
                ␣
              </button>
              <button
                type="button"
                className={keyBtnClassFor('backspace', 'min-w-[2.85rem] px-2.5 sm:min-w-[3rem]')}
                {...makeOskEditKeyHandlers('backspace', () => 'backspace')}
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
              slotsEditable={shortcutSlotsEditable}
              onClose={() => hideKeyboard(true)}
              onDraftChange={applyLineShortcutDraft}
              onSlotFocus={attachField}
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

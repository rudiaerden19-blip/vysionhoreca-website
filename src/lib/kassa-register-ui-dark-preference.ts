'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchKassaPosState, patchKassaPosState } from '@/lib/kassa-pos-state-client'
import {
  kassaUiLayoutIsDark,
  parseKassaUiLayout,
  type KassaUiLayoutId,
} from '@/lib/kassa-ui-layout'

export const KASSA_UI_DARK_EVENT = 'vysion:kassa-ui-dark-change'

/** Donker/licht-toggle in kassa-titelbalk — opgeslagen in Supabase `kassa_pos_state`. */
export const KASSA_UI_APPEARANCE_TOGGLE_ENABLED = true

export function kassaUiDarkStorageKey(_tenantSlug: string): string {
  return ''
}

export function readKassaUiDarkPreference(_tenantSlug: string): boolean {
  return true
}

export function writeKassaUiDarkPreference(tenantSlug: string, dark: boolean): void {
  writeKassaUiLayoutPreference(tenantSlug, dark ? 'luxe' : 'light')
}

export function writeKassaUiLayoutPreference(tenantSlug: string, layout: KassaUiLayoutId): void {
  if (typeof window === 'undefined') return
  const dark = kassaUiLayoutIsDark(layout)
  void patchKassaPosState(tenantSlug, { kassa_ui_dark: dark, kassa_ui_layout: layout })
  try {
    window.dispatchEvent(
      new CustomEvent(KASSA_UI_DARK_EVENT, { detail: { tenantSlug, dark, layout } }),
    )
  } catch {
    /* noop */
  }
}

type DarkChangeDetail = { tenantSlug?: string; dark?: boolean; layout?: KassaUiLayoutId }

export function useKassaUiLayoutSync(tenantSlug: string): {
  layout: KassaUiLayoutId
  dark: boolean
  setLayout: (next: KassaUiLayoutId) => void
  setDark: (next: boolean) => void
  toggle: () => void
} {
  const [layout, setLayoutState] = useState<KassaUiLayoutId>('luxe')
  const [hydrated, setHydrated] = useState(false)
  const dark = kassaUiLayoutIsDark(layout)

  useEffect(() => {
    let cancelled = false
    void fetchKassaPosState(tenantSlug).then((state) => {
      if (cancelled) return
      setLayoutState(parseKassaUiLayout(state.kassa_ui_layout, state.kassa_ui_dark))
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [tenantSlug])

  useEffect(() => {
    if (!hydrated) return

    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<DarkChangeDetail>
      if (ce.detail?.tenantSlug !== tenantSlug) return
      if (ce.detail.layout) {
        setLayoutState(ce.detail.layout)
        return
      }
      if (typeof ce.detail.dark === 'boolean') {
        setLayoutState(ce.detail.dark ? 'luxe' : 'light')
      }
    }

    window.addEventListener(KASSA_UI_DARK_EVENT, onCustom as EventListener)
    return () => window.removeEventListener(KASSA_UI_DARK_EVENT, onCustom as EventListener)
  }, [tenantSlug, hydrated])

  const setLayout = useCallback(
    (next: KassaUiLayoutId) => {
      writeKassaUiLayoutPreference(tenantSlug, next)
      setLayoutState(next)
    },
    [tenantSlug],
  )

  const setDark = useCallback(
    (next: boolean) => {
      setLayout(next ? 'luxe' : 'light')
    },
    [setLayout],
  )

  const toggle = useCallback(() => {
    setDark(!dark)
  }, [dark, setDark])

  return { layout, dark, setLayout, setDark, toggle }
}

/** Onlinescherm / keuken: alleen donker/licht, afgeleid van de kassa-layout. */
export function useKassaUiDarkSync(tenantSlug: string): {
  dark: boolean
  setDark: (next: boolean) => void
  toggle: () => void
} {
  const { dark, setDark, toggle } = useKassaUiLayoutSync(tenantSlug)
  return { dark, setDark, toggle }
}

'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { fetchKassaPosState, patchKassaPosState } from '@/lib/kassa-pos-state-client'
import {
  isKassaUiLayoutId,
  kassaUiLayoutIsDark,
  resolveKassaUiLayout,
  type KassaUiLayoutId,
} from '@/lib/kassa-ui-layout'

export const KASSA_UI_DARK_EVENT = 'vysion:kassa-ui-dark-change'

/** Donker/licht-toggle in kassa-titelbalk — opgeslagen in Supabase `kassa_pos_state`. */
export const KASSA_UI_APPEARANCE_TOGGLE_ENABLED = true

export function kassaUiLayoutStorageKey(tenantSlug: string): string {
  return `vysion_kassa_ui_layout_v1:${tenantSlug}`
}

export function kassaUiDarkStorageKey(_tenantSlug: string): string {
  return ''
}

export function readKassaUiLayoutPreference(tenantSlug: string): KassaUiLayoutId | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(kassaUiLayoutStorageKey(tenantSlug))
    return isKassaUiLayoutId(raw) ? raw : null
  } catch {
    return null
  }
}

export function persistKassaUiLayoutLocal(tenantSlug: string, layout: KassaUiLayoutId): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(kassaUiLayoutStorageKey(tenantSlug), layout)
  } catch {
    /* noop */
  }
}

export function readKassaUiDarkPreference(_tenantSlug: string): boolean {
  return true
}

export function writeKassaUiDarkPreference(tenantSlug: string, dark: boolean): void {
  writeKassaUiLayoutPreference(tenantSlug, dark ? 'luxe' : 'light')
}

export function writeKassaUiLayoutPreference(tenantSlug: string, layout: KassaUiLayoutId): void {
  if (typeof window === 'undefined') return
  persistKassaUiLayoutLocal(tenantSlug, layout)
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
  const [layout, setLayoutState] = useState<KassaUiLayoutId>(
    () => readKassaUiLayoutPreference(tenantSlug) ?? 'luxe',
  )
  const [hydrated, setHydrated] = useState(false)
  const dark = kassaUiLayoutIsDark(layout)

  useLayoutEffect(() => {
    const local = readKassaUiLayoutPreference(tenantSlug)
    if (local) setLayoutState(local)
  }, [tenantSlug])

  useEffect(() => {
    let cancelled = false
    void fetchKassaPosState(tenantSlug).then((state) => {
      if (cancelled) return
      const next = resolveKassaUiLayout(
        state.kassa_ui_layout,
        state.kassa_ui_dark,
        readKassaUiLayoutPreference(tenantSlug),
      )
      persistKassaUiLayoutLocal(tenantSlug, next)
      setLayoutState(next)
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

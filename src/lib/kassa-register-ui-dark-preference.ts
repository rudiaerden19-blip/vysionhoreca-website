'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchKassaPosState, patchKassaPosState } from '@/lib/kassa-pos-state-client'

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
  if (typeof window === 'undefined') return
  void patchKassaPosState(tenantSlug, { kassa_ui_dark: dark })
  try {
    window.dispatchEvent(
      new CustomEvent(KASSA_UI_DARK_EVENT, { detail: { tenantSlug, dark } }),
    )
  } catch {
    /* noop */
  }
}

type DarkChangeDetail = { tenantSlug?: string; dark?: boolean }

export function useKassaUiDarkSync(tenantSlug: string): {
  dark: boolean
  setDark: (next: boolean) => void
  toggle: () => void
} {
  const [dark, setDarkState] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchKassaPosState(tenantSlug).then((state) => {
      if (cancelled) return
      if (typeof state.kassa_ui_dark === 'boolean') {
        setDarkState(state.kassa_ui_dark)
      } else {
        setDarkState(true)
      }
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
      if (typeof ce.detail.dark === 'boolean') setDarkState(ce.detail.dark)
    }

    window.addEventListener(KASSA_UI_DARK_EVENT, onCustom as EventListener)
    return () => window.removeEventListener(KASSA_UI_DARK_EVENT, onCustom as EventListener)
  }, [tenantSlug, hydrated])

  const setDark = useCallback(
    (next: boolean) => {
      writeKassaUiDarkPreference(tenantSlug, next)
      setDarkState(next)
    },
    [tenantSlug],
  )

  const toggle = useCallback(() => {
    setDark(!dark)
  }, [dark, setDark])

  return { dark, setDark, toggle }
}

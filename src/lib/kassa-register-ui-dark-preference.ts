'use client'

import { useCallback, useEffect, useState } from 'react'

export const KASSA_UI_DARK_EVENT = 'vysion:kassa-ui-dark-change'

/** Donker/licht-toggle in kassa-titelbalk (per tenant, localStorage). */
export const KASSA_UI_APPEARANCE_TOGGLE_ENABLED = true

export function kassaUiDarkStorageKey(tenantSlug: string): string {
  return `vysion:kassa-pro-dark:v1:${tenantSlug}`
}

export function readKassaUiDarkPreference(tenantSlug: string): boolean {
  if (!KASSA_UI_APPEARANCE_TOGGLE_ENABLED) return true
  if (typeof window === 'undefined') return true
  try {
    const stored = window.localStorage.getItem(kassaUiDarkStorageKey(tenantSlug))
    if (stored === null) return true
    return stored === '1'
  } catch {
    return true
  }
}

/** Zelfde-tab + andere tabs/apparaten luisteren op event / storage */
export function writeKassaUiDarkPreference(tenantSlug: string, dark: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(kassaUiDarkStorageKey(tenantSlug), dark ? '1' : '0')
  } catch {
    /* private mode etc. */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(KASSA_UI_DARK_EVENT, { detail: { tenantSlug, dark } }),
    )
  } catch {
    /* noop */
  }
}

type DarkChangeDetail = { tenantSlug?: string; dark?: boolean }

/**
 * Gedeelde donkere modus voor kassa (per tenant, per browser).
 * Werkt over admin-layout en volledig scherm /kassa heen via localStorage + CustomEvent.
 */
export function useKassaUiDarkSync(tenantSlug: string): {
  dark: boolean
  setDark: (next: boolean) => void
  toggle: () => void
} {
  const [dark, setDarkState] = useState(() =>
    typeof window === 'undefined' ? true : readKassaUiDarkPreference(tenantSlug),
  )

  useEffect(() => {
    setDarkState(readKassaUiDarkPreference(tenantSlug))

    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<DarkChangeDetail>
      if (ce.detail?.tenantSlug !== tenantSlug) return
      if (typeof ce.detail.dark === 'boolean') setDarkState(ce.detail.dark)
    }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== kassaUiDarkStorageKey(tenantSlug)) return
      setDarkState(readKassaUiDarkPreference(tenantSlug))
    }

    window.addEventListener(KASSA_UI_DARK_EVENT, onCustom as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(KASSA_UI_DARK_EVENT, onCustom as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [tenantSlug])

  const setDark = useCallback(
    (next: boolean) => {
      writeKassaUiDarkPreference(tenantSlug, next)
      setDarkState(next)
    },
    [tenantSlug],
  )

  const toggle = useCallback(() => {
    const next = !readKassaUiDarkPreference(tenantSlug)
    writeKassaUiDarkPreference(tenantSlug, next)
    setDarkState(next)
  }, [tenantSlug])

  return { dark, setDark, toggle }
}

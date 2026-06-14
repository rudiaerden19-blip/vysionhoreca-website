'use client'

import { fetchKassaPosState, patchKassaPosState } from '@/lib/kassa-pos-state-client'

export type TouchKeyboardLetterLayout = 'azerty' | 'qwerty'

export type TouchUiPrefs = {
  kb_layout?: TouchKeyboardLetterLayout
  kb_panel_pos?: { x: number; y: number } | null
  kb_off?: boolean
  kb_force?: boolean
}

const cacheByTenant: Record<string, TouchUiPrefs> = {}

export function getCachedTouchUiPrefs(tenantSlug: string): TouchUiPrefs {
  return cacheByTenant[tenantSlug] ?? {}
}

export async function loadTouchUiPrefs(tenantSlug: string): Promise<TouchUiPrefs> {
  const state = await fetchKassaPosState(tenantSlug)
  const prefs = (state.touch_ui_prefs ?? {}) as TouchUiPrefs
  cacheByTenant[tenantSlug] = prefs
  return prefs
}

export async function persistTouchUiPrefs(
  tenantSlug: string,
  patch: Partial<TouchUiPrefs>,
): Promise<void> {
  const next = { ...getCachedTouchUiPrefs(tenantSlug), ...patch }
  cacheByTenant[tenantSlug] = next
  await patchKassaPosState(tenantSlug, { touch_ui_prefs: next as Record<string, unknown> })
}

export function shopTenantSlugFromPathname(pathname: string): string | null {
  const m = (pathname || '').match(/^\/shop\/([^/]+)/i)
  return m?.[1]?.trim() || null
}

/** Kassa/admin én keukenscherm delen dezelfde touch-prefs per tenant. */
export function touchPrefsTenantFromPathname(pathname: string): string | null {
  const shop = shopTenantSlugFromPathname(pathname)
  if (shop) return shop
  const m = (pathname || '').match(/^\/keuken\/([^/]+)/i)
  return m?.[1]?.trim() || null
}

export function touchPrefsTenantFromWindow(): string | null {
  if (typeof window === 'undefined') return null
  return touchPrefsTenantFromPathname(window.location.pathname)
}

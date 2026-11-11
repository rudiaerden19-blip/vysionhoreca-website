/**
 * Eén viewport-profiel per browsersessie: lab, kassa, keuken en display zelfde chrome.
 * Zonder dit verliest navigatie kvp/lab-params → profiel springt naar default (pijltjes weg).
 */

import {
  applyKassaLayoutPreviewViewportFromSearchParams,
  KASSA_LAYOUT_PREVIEW_LAB_H,
  KASSA_LAYOUT_PREVIEW_LAB_W,
  KASSA_LAYOUT_PREVIEW_QUERY,
} from '@/lib/kassa-layout-preview'
import { KASSA_PREVIEW_PARAM_BOOST, KASSA_PREVIEW_PARAM_COLS, KASSA_PREVIEW_PARAM_GAP, KASSA_PREVIEW_PARAM_ROWS, KASSA_PREVIEW_PARAM_SIDEBAR } from '@/lib/kassa-layout-preview-settings'
import type { KassaViewportProfileId } from '@/lib/kassa-viewport-profile-id'
import { isKassaViewportProfileId } from '@/lib/kassa-viewport-profile-id'

const SESSION_KEY = 'vysion:kassa-viewport-profile-context:v1'

const PASSTHROUGH_QUERY_KEYS = [
  'kvp',
  KASSA_LAYOUT_PREVIEW_QUERY,
  'vp',
  'ipad',
  KASSA_LAYOUT_PREVIEW_LAB_W,
  KASSA_LAYOUT_PREVIEW_LAB_H,
  KASSA_PREVIEW_PARAM_SIDEBAR,
  KASSA_PREVIEW_PARAM_BOOST,
  KASSA_PREVIEW_PARAM_COLS,
  KASSA_PREVIEW_PARAM_GAP,
  KASSA_PREVIEW_PARAM_ROWS,
] as const

export type KassaViewportProfileContextSession = {
  kvp: KassaViewportProfileId
  params: Record<string, string>
}

function sessionStorageOk(): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false
    sessionStorage.setItem(SESSION_KEY, sessionStorage.getItem(SESSION_KEY) ?? '')
    return true
  } catch {
    return false
  }
}

function pickPassthroughParams(sp: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {}
  for (const key of PASSTHROUGH_QUERY_KEYS) {
    const v = sp.get(key)
    if (v != null && v !== '') params[key] = v
  }
  return params
}

/** Na elke succesvolle profiel-resolutie (URL of device) — sessie = bron voor volgende pagina's. */
export function persistKassaViewportProfileContext(
  profileId: KassaViewportProfileId,
  searchParams?: URLSearchParams,
): void {
  if (!sessionStorageOk()) return
  const sp =
    searchParams ??
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams())
  const params = pickPassthroughParams(sp)
  params.kvp = profileId
  const payload: KassaViewportProfileContextSession = { kvp: profileId, params }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
}

export function readKassaViewportProfileContextSession(): KassaViewportProfileContextSession | null {
  if (!sessionStorageOk()) return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as KassaViewportProfileContextSession
    if (!parsed?.kvp || !isKassaViewportProfileId(parsed.kvp)) return null
    if (!parsed.params || typeof parsed.params !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function stickyKassaViewportProfileId(): KassaViewportProfileId | null {
  return readKassaViewportProfileContextSession()?.kvp ?? null
}

/** POS-interne links: kvp + lab-preview parameters meenemen (zelfde tab/sessie). */
export function withKassaViewportProfileContext(href: string): string {
  if (typeof window === 'undefined') return href

  const merged: Record<string, string> = {
    ...(readKassaViewportProfileContextSession()?.params ?? {}),
  }
  const current = new URLSearchParams(window.location.search)
  for (const key of PASSTHROUGH_QUERY_KEYS) {
    const v = current.get(key)
    if (v != null && v !== '') merged[key] = v
  }
  const sticky = stickyKassaViewportProfileId()
  if (sticky && !merged.kvp) merged.kvp = sticky

  if (Object.keys(merged).length === 0) return href

  const pathOnly = href.split('?')[0]?.split('#')[0] ?? href
  const hash = href.includes('#') ? href.slice(href.indexOf('#')) : ''
  const u = new URL(pathOnly, window.location.origin)
  for (const [k, v] of Object.entries(merged)) {
    if (v) u.searchParams.set(k, v)
  }
  return `${u.pathname}${u.search}${hash}`
}

/** Lab-viewport op kassa na terugkeer zonder query in URL. */
export function applyKassaViewportProfileContextFromSession(): (() => void) | undefined {
  const session = readKassaViewportProfileContextSession()
  if (!session?.params) return undefined
  return applyKassaLayoutPreviewViewportFromSearchParams(new URLSearchParams(session.params))
}

/** URL + sessie — lab-preview en kvp blijven gelden op keuken/display. */
export function mergedKassaPosSearchParams(): URLSearchParams {
  const merged = new URLSearchParams()
  const session = readKassaViewportProfileContextSession()
  if (session?.params) {
    for (const [k, v] of Object.entries(session.params)) {
      if (v) merged.set(k, v)
    }
  }
  if (typeof window !== 'undefined') {
    const cur = new URLSearchParams(window.location.search)
    for (const key of PASSTHROUGH_QUERY_KEYS) {
      const v = cur.get(key)
      if (v != null && v !== '') merged.set(key, v)
    }
  }
  return merged
}

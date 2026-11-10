import type { KassaViewportProfileSettingsMap } from '@/lib/kassa-viewport-profile-settings'
export type { KassaViewportProfileSettingsMap } from '@/lib/kassa-viewport-profile-settings'
import type { KassaViewportProfileId } from '@/lib/kassa-viewport-profile-id'
import { applyProfileSettingsToChromeTokens } from '@/lib/kassa-viewport-profile-settings'
import type { KassaViewportChromeTokens } from '@/lib/kassa-viewport-chrome-tokens'
import { isKassaLayoutPreviewSearchParams } from '@/lib/kassa-layout-preview'
import { readKassaLayoutPreviewSettingsPatch } from '@/lib/kassa-layout-preview-settings'

const SESSION_KEY = 'vysion-kassa-vp-settings-v2'

const EMPTY_SETTINGS = { version: '0', map: {} as KassaViewportProfileSettingsMap }

export function readCachedKassaViewportProfileSettings(): {
  version: string
  map: KassaViewportProfileSettingsMap
} | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { version?: string; map?: KassaViewportProfileSettingsMap }
    if (!parsed.map) return null
    return { version: parsed.version ?? '0', map: parsed.map }
  } catch {
    return null
  }
}

export function writeCachedKassaViewportProfileSettings(
  version: string,
  map: KassaViewportProfileSettingsMap,
): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ version, map }))
  } catch {
    /* ignore quota */
  }
}

export async function fetchKassaViewportProfileSettingsMap(): Promise<{
  version: string
  map: KassaViewportProfileSettingsMap
}> {
  try {
    const res = await fetch('/api/kassa/viewport-profile-settings', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
    if (!res.ok) {
      const cached = readCachedKassaViewportProfileSettings()
      return cached ?? EMPTY_SETTINGS
    }
    const body = (await res.json()) as { version?: string; map?: KassaViewportProfileSettingsMap }
    const version = body.version ?? '0'
    const map = body.map ?? {}
    writeCachedKassaViewportProfileSettings(version, map)
    return { version, map }
  } catch {
    const cached = readCachedKassaViewportProfileSettings()
    return cached ?? EMPTY_SETTINGS
  }
}

export function resolveKassaChromeTokensForProfile(
  profileId: KassaViewportProfileId,
  map: KassaViewportProfileSettingsMap,
): KassaViewportChromeTokens {
  try {
    const patch = map[profileId] ?? {}
    return applyProfileSettingsToChromeTokens(profileId, patch)
  } catch {
    return applyProfileSettingsToChromeTokens(profileId, {})
  }
}

/**
 * Kassa-pagina: layout-lab negeert Supabase-studio (anders zie je refresh geen deploy-defaults).
 * Optionele k_* query = live draft bovenop code-defaults.
 */
export function resolveKassaChromeTokensForKassa(
  profileId: KassaViewportProfileId,
  map: KassaViewportProfileSettingsMap,
): KassaViewportChromeTokens {
  try {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      if (isKassaLayoutPreviewSearchParams(sp)) {
        const urlPatch = readKassaLayoutPreviewSettingsPatch(sp) ?? {}
        return applyProfileSettingsToChromeTokens(profileId, urlPatch)
      }
    }
    return resolveKassaChromeTokensForProfile(profileId, map)
  } catch {
    return applyProfileSettingsToChromeTokens(profileId, {})
  }
}

import type { KassaViewportProfileId } from '@/lib/kassa-viewport-profile-id'
import {
  type KassaViewportChromeTokens,
  getKassaViewportChromeTokens,
} from '@/lib/kassa-viewport-chrome-tokens'

/** Alleen chrome — geen flows, geen print. */
export type KassaViewportProfileSettings = {
  sidebarWidthPx: number
  menuClassicGridCols: number
  menuTileHeightBoost: number
  menuGridGapPx: number
  menuVisibleRows: number
}

export type KassaViewportProfileSettingsPatch = Partial<KassaViewportProfileSettings>

export const KASSA_VIEWPORT_SETTINGS_LIMITS = {
  sidebarWidthPx: { min: 220, max: 480 },
  menuClassicGridCols: { min: 2, max: 6 },
  menuTileHeightBoost: { min: 0.75, max: 1.45 },
  menuGridGapPx: { min: 8, max: 24 },
  menuVisibleRows: { min: 2, max: 5 },
} as const

export function kassaDefaultProfileSettingsFromTokens(
  profileId: KassaViewportProfileId,
): KassaViewportProfileSettings {
  const t = getKassaViewportChromeTokens(profileId)
  return {
    sidebarWidthPx: t.sidebarWidthPx,
    menuClassicGridCols: t.menuClassicGridCols,
    menuTileHeightBoost: t.menuTileHeightBoost,
    menuGridGapPx: t.menuGridGapPx,
    menuVisibleRows: t.menuVisibleRows,
  }
}

function clampNum(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

export function sanitizeKassaViewportProfileSettingsPatch(
  raw: unknown,
): KassaViewportProfileSettingsPatch {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const patch: KassaViewportProfileSettingsPatch = {}
  const lim = KASSA_VIEWPORT_SETTINGS_LIMITS
  if (typeof o.sidebarWidthPx === 'number') {
    patch.sidebarWidthPx = clampNum(o.sidebarWidthPx, lim.sidebarWidthPx.min, lim.sidebarWidthPx.max)
  }
  if (typeof o.menuClassicGridCols === 'number') {
    patch.menuClassicGridCols = Math.round(
      clampNum(o.menuClassicGridCols, lim.menuClassicGridCols.min, lim.menuClassicGridCols.max),
    )
  }
  if (typeof o.menuTileHeightBoost === 'number') {
    patch.menuTileHeightBoost = clampNum(
      o.menuTileHeightBoost,
      lim.menuTileHeightBoost.min,
      lim.menuTileHeightBoost.max,
    )
  }
  if (typeof o.menuGridGapPx === 'number') {
    patch.menuGridGapPx = Math.round(
      clampNum(o.menuGridGapPx, lim.menuGridGapPx.min, lim.menuGridGapPx.max),
    )
  }
  if (typeof o.menuVisibleRows === 'number') {
    patch.menuVisibleRows = Math.round(
      clampNum(o.menuVisibleRows, lim.menuVisibleRows.min, lim.menuVisibleRows.max),
    )
  }
  return patch
}

export function mergeKassaViewportProfileSettings(
  profileId: KassaViewportProfileId,
  patch: KassaViewportProfileSettingsPatch,
): KassaViewportProfileSettings {
  const base = kassaDefaultProfileSettingsFromTokens(profileId)
  return { ...base, ...patch }
}

export function applyProfileSettingsToChromeTokens(
  profileId: KassaViewportProfileId,
  patch: KassaViewportProfileSettingsPatch,
): KassaViewportChromeTokens {
  const merged = mergeKassaViewportProfileSettings(profileId, patch)
  const base = getKassaViewportChromeTokens(profileId)
  return {
    ...base,
    profile: profileId,
    sidebarWidthPx: merged.sidebarWidthPx,
    oskRightInsetPx: merged.sidebarWidthPx + 4,
    menuClassicGridCols: merged.menuClassicGridCols,
    menuTileHeightBoost: merged.menuTileHeightBoost,
    menuGridGapPx: merged.menuGridGapPx,
    menuVisibleRows: merged.menuVisibleRows,
  }
}

export type KassaViewportProfileSettingsRow = {
  profileId: KassaViewportProfileId
  settings: KassaViewportProfileSettingsPatch
  updatedAt: string | null
  updatedByEmail: string | null
}

export type KassaViewportProfileSettingsMap = Partial<
  Record<KassaViewportProfileId, KassaViewportProfileSettingsPatch>
>

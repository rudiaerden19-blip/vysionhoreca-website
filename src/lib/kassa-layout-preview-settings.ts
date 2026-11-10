import {
  isKassaLayoutPreviewSearchParams,
  KASSA_LAYOUT_PREVIEW_QUERY,
} from '@/lib/kassa-layout-preview'
import type { KassaViewportProfileSettings } from '@/lib/kassa-viewport-profile-settings'
import {
  sanitizeKassaViewportProfileSettingsPatch,
  type KassaViewportProfileSettingsPatch,
} from '@/lib/kassa-viewport-profile-settings'

/** Draft van studio in preview-URL — zelfde chrome als kassa in de zaak (logisch 1366×768). */
export const KASSA_PREVIEW_PARAM_SIDEBAR = 'k_sidebar'
export const KASSA_PREVIEW_PARAM_BOOST = 'k_boost'
export const KASSA_PREVIEW_PARAM_COLS = 'k_cols'
export const KASSA_PREVIEW_PARAM_GAP = 'k_gap'
export const KASSA_PREVIEW_PARAM_ROWS = 'k_rows'

function num(sp: URLSearchParams, key: string): number | undefined {
  const v = Number.parseFloat(sp.get(key) ?? '')
  return Number.isFinite(v) ? v : undefined
}

export function readKassaLayoutPreviewSettingsPatch(
  sp: URLSearchParams,
): KassaViewportProfileSettingsPatch | null {
  if (!isKassaLayoutPreviewSearchParams(sp)) return null
  const raw: Record<string, number> = {}
  const side = num(sp, KASSA_PREVIEW_PARAM_SIDEBAR)
  const boost = num(sp, KASSA_PREVIEW_PARAM_BOOST)
  const cols = num(sp, KASSA_PREVIEW_PARAM_COLS)
  const gap = num(sp, KASSA_PREVIEW_PARAM_GAP)
  const rows = num(sp, KASSA_PREVIEW_PARAM_ROWS)
  if (side != null) raw.sidebarWidthPx = side
  if (boost != null) raw.menuTileHeightBoost = boost
  if (cols != null) raw.menuClassicGridCols = cols
  if (gap != null) raw.menuGridGapPx = gap
  if (rows != null) raw.menuVisibleRows = rows
  if (Object.keys(raw).length === 0) return null
  return sanitizeKassaViewportProfileSettingsPatch(raw)
}

export function appendKassaPreviewSettingsToUrl(
  kassaUrl: string,
  settings: KassaViewportProfileSettings,
): string {
  const u = new URL(kassaUrl)
  if (u.searchParams.get(KASSA_LAYOUT_PREVIEW_QUERY) !== '1') {
    u.searchParams.set(KASSA_LAYOUT_PREVIEW_QUERY, '1')
  }
  u.searchParams.set(KASSA_PREVIEW_PARAM_SIDEBAR, String(settings.sidebarWidthPx))
  u.searchParams.set(KASSA_PREVIEW_PARAM_BOOST, String(settings.menuTileHeightBoost))
  u.searchParams.set(KASSA_PREVIEW_PARAM_COLS, String(settings.menuClassicGridCols))
  u.searchParams.set(KASSA_PREVIEW_PARAM_GAP, String(settings.menuGridGapPx))
  u.searchParams.set(KASSA_PREVIEW_PARAM_ROWS, String(settings.menuVisibleRows))
  return u.toString()
}

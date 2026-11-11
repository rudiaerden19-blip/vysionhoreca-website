/**
 * Vaste chrome per kassascherm-profiel — wijzig alleen binnen het betreffende profiel-object.
 * Superadmin overrides: `applyProfileSettingsToChromeTokens`.
 */

import type { KassaViewportProfileId } from '@/lib/kassa-viewport-profile-id'

/** @deprecated Gebruik `KassaViewportProfileId` — alias voor bestaande density UI. */
export type KassaViewportChromeProfile = KassaViewportProfileId

export type KassaViewportChromeTokens = {
  profile: KassaViewportProfileId
  /** Vaste mandbreedte (px); sync met sidebar Tailwind `w-[…px]`. */
  sidebarWidthPx: number
  /** OSK vast → rechter inset tot start mand. */
  oskRightInsetPx: number
  /** Ruimte voor menu-raster schatting (sidebar + horizontale padding). */
  menuGridHorizontalPadPx: number
  /** Max menu-kolommen (classic grid hint; iPad cap apart). */
  menuClassicGridCols: number
  /** Vermenigvuldiger rijhoogte menu-tegels. */
  menuTileHeightBoost: number
  /** Tailwind gap-4 = 16px default */
  menuGridGapPx: number
  /** Doelrijen in scrollport voor row-hoogte berekening. */
  menuVisibleRows: number
}

/** 17″ SXGA — sync `.cursor/rules/kassa-17inch-sxga.mdc` (niet wijzigen zonder 17″-opdracht). */
export const KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX = 332
/** 15″ breedbeeld — smallere (smaller) tegels, hogere rij, bredere mand (nov 2026). */
export const KASSA_SIDEBAR_WIDTH_WIDE15_PX = 400
/** iPad 10.2″ landschap — smallere tegels, bredere mand (nov 2026). */
export const KASSA_SIDEBAR_WIDTH_IPAD_10_PX = 360
/** 21″ / grote desktop (lg breakpoint in kassa). */
export const KASSA_SIDEBAR_WIDTH_DEFAULT_LG_PX = 380
export const KASSA_SIDEBAR_WIDTH_DEFAULT_SM_PX = 384
export const KASSA_SIDEBAR_WIDTH_DEFAULT_BASE_PX = 320

export const KASSA_MENU_GRID_GAP_PX_DEFAULT = 16
export const KASSA_MENU_VISIBLE_ROWS_DEFAULT = 3
export const KASSA_MENU_TILE_HEIGHT_BOOST_DEFAULT = 1

const OSK_EDGE_GUTTER_PX = 4

const WIDE15: KassaViewportChromeTokens = {
  profile: 'wide15',
  sidebarWidthPx: KASSA_SIDEBAR_WIDTH_WIDE15_PX,
  oskRightInsetPx: KASSA_SIDEBAR_WIDTH_WIDE15_PX + OSK_EDGE_GUTTER_PX,
  menuGridHorizontalPadPx: 32,
  menuClassicGridCols: 4,
  menuTileHeightBoost: 1.06,
  menuGridGapPx: KASSA_MENU_GRID_GAP_PX_DEFAULT,
  menuVisibleRows: KASSA_MENU_VISIBLE_ROWS_DEFAULT,
}

const SXGA: KassaViewportChromeTokens = {
  profile: 'sxga',
  sidebarWidthPx: KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX,
  oskRightInsetPx: KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX + OSK_EDGE_GUTTER_PX,
  menuGridHorizontalPadPx: 32,
  menuClassicGridCols: 5,
  menuTileHeightBoost: KASSA_MENU_TILE_HEIGHT_BOOST_DEFAULT,
  menuGridGapPx: KASSA_MENU_GRID_GAP_PX_DEFAULT,
  menuVisibleRows: KASSA_MENU_VISIBLE_ROWS_DEFAULT,
}

const DEFAULT_DESKTOP: KassaViewportChromeTokens = {
  profile: 'default',
  sidebarWidthPx: KASSA_SIDEBAR_WIDTH_DEFAULT_LG_PX,
  oskRightInsetPx: KASSA_SIDEBAR_WIDTH_DEFAULT_LG_PX + OSK_EDGE_GUTTER_PX,
  menuGridHorizontalPadPx: 32,
  menuClassicGridCols: 6,
  menuTileHeightBoost: KASSA_MENU_TILE_HEIGHT_BOOST_DEFAULT,
  menuGridGapPx: KASSA_MENU_GRID_GAP_PX_DEFAULT,
  menuVisibleRows: KASSA_MENU_VISIBLE_ROWS_DEFAULT,
}

const IPAD_129: KassaViewportChromeTokens = {
  profile: 'ipad_129',
  sidebarWidthPx: 340,
  oskRightInsetPx: 340 + OSK_EDGE_GUTTER_PX,
  menuGridHorizontalPadPx: 32,
  menuClassicGridCols: 4,
  menuTileHeightBoost: KASSA_MENU_TILE_HEIGHT_BOOST_DEFAULT,
  menuGridGapPx: KASSA_MENU_GRID_GAP_PX_DEFAULT,
  menuVisibleRows: KASSA_MENU_VISIBLE_ROWS_DEFAULT,
}

const IPAD_10: KassaViewportChromeTokens = {
  profile: 'ipad_10',
  sidebarWidthPx: KASSA_SIDEBAR_WIDTH_IPAD_10_PX,
  oskRightInsetPx: KASSA_SIDEBAR_WIDTH_IPAD_10_PX + OSK_EDGE_GUTTER_PX,
  menuGridHorizontalPadPx: 28,
  menuClassicGridCols: 4,
  menuTileHeightBoost: KASSA_MENU_TILE_HEIGHT_BOOST_DEFAULT,
  menuGridGapPx: 14,
  menuVisibleRows: 3,
}

const PROFILE_TABLE: Record<KassaViewportProfileId, KassaViewportChromeTokens> = {
  wide15: WIDE15,
  sxga: SXGA,
  default: DEFAULT_DESKTOP,
  ipad_129: IPAD_129,
  ipad_10: IPAD_10,
}

/** Lab + documentatie: kritieke schermen vóór deploy. */
export const KASSA_LAYOUT_REGRESSION_FRAME_IDS = ['15', '17', '21'] as const

export function getKassaViewportChromeTokens(
  profile: KassaViewportProfileId,
): KassaViewportChromeTokens {
  return PROFILE_TABLE[profile] ?? DEFAULT_DESKTOP
}

export function kassaViewportChromeCssVars(tokens: KassaViewportChromeTokens): Record<string, string> {
  return {
    '--kassa-sidebar-width': `${tokens.sidebarWidthPx}px`,
    '--kassa-osk-right-inset': `${tokens.oskRightInsetPx}px`,
    '--kassa-menu-tile-boost': String(tokens.menuTileHeightBoost),
  }
}

/** Default-profiel: sidebar kan nog op sm/base smaller zijn — alleen voor niet-compact chrome. */
export function estimateKassaSidebarWidthPxForInnerWidth(
  profile: KassaViewportProfileId,
  viewportInnerWidth: number,
): number {
  const t = getKassaViewportChromeTokens(profile)
  if (
    profile === 'wide15' ||
    profile === 'sxga' ||
    profile === 'ipad_129' ||
    profile === 'ipad_10'
  ) {
    return t.sidebarWidthPx
  }
  if (viewportInnerWidth >= 1024) return t.sidebarWidthPx
  if (viewportInnerWidth >= 640) return KASSA_SIDEBAR_WIDTH_DEFAULT_SM_PX
  return KASSA_SIDEBAR_WIDTH_DEFAULT_BASE_PX
}

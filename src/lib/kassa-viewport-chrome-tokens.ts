/**
 * Vaste chrome per kassascherm-profiel — wijzig alleen binnen het betreffende profiel-object.
 * Superadmin overrides: `applyProfileSettingsToChromeTokens`.
 */

import type { KassaViewportProfileId } from '@/lib/kassa-viewport-profile-id'

/** @deprecated Gebruik `KassaViewportProfileId` — alias voor bestaande density UI. */
export type KassaViewportChromeProfile = KassaViewportProfileId

/** AZERTY-numpad: max breedte één toets (CSS-lengte). */
export const KASSA_AZERTY_OSK_NUMPAD_KEY_WIDTH_DEFAULT = '4cm'
/** 15″ / 17″: smallere cijferstrook → meer ruimte voor AZERTY. */
export const KASSA_AZERTY_OSK_NUMPAD_KEY_WIDTH_WIDE_COMPACT = '3.35cm'

export function kassaAzertyOskNumpadStripWidthFromKeyWidth(keyWidth: string): string {
  return `calc(calc(${keyWidth} * 2 + 0.35rem) + 0.65rem)`
}

export function resolveKassaOskNumpadKeyWidth(profile: KassaViewportProfileId): string {
  if (profile === 'wide15' || profile === 'sxga') {
    return KASSA_AZERTY_OSK_NUMPAD_KEY_WIDTH_WIDE_COMPACT
  }
  return KASSA_AZERTY_OSK_NUMPAD_KEY_WIDTH_DEFAULT
}

export type KassaViewportChromeTokens = {
  profile: KassaViewportProfileId
  /** Vaste mandbreedte (px); sync met sidebar Tailwind `w-[…px]`. */
  sidebarWidthPx: number
  /** OSK vast → rechter inset tot start mand. */
  oskRightInsetPx: number
  /** Numpad links in AZERTY-panel (kassa). */
  oskNumpadKeyWidth: string
  oskNumpadStripWidth: string
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
  kdsColumnWidthPx: number
  kdsColumnCompactTypography: boolean
}

/** 17″ SXGA — sync `.cursor/rules/kassa-17inch-sxga.mdc` (niet wijzigen zonder 17″-opdracht). */
export const KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX = 332
/**
 * Speels/luxury 17″: zaaknaam in band tussen snelkoppelingen (links) en Toetsenbord/Uitloggen (rechts).
 * Geen padding-truc — echte horizontale centrering in die band; knoppen blijven op hun plek.
 */
export const KASSA_SXGA_LUXURY_HEADER_TENANT_OVERLAY_INSET =
  'left-[26rem] right-[12.5rem]'
export const KASSA_SXGA_LUXURY_HEADER_TENANT_NAME_SIZE_CLASS = 'text-sm font-bold sm:text-base'
/** Inhoudsbreedte — geen truncate / geen flex-shrink naar 0. */
export const KASSA_SXGA_LUXURY_HEADER_TENANT_NAME_MAX_WIDTH_CLASS =
  'inline-flex w-auto max-w-none shrink-0 overflow-visible'
/** 15″ / 21″ / overige: bestaande symmetrische inset. */
export const KASSA_LUXURY_HEADER_TENANT_OVERLAY_PADDING_DEFAULT =
  'px-[5.5rem] sm:px-[9rem] md:px-[11rem]'
/** 17″ knoplabels — sync lab (1280×1024) en kiosk; 15″/21″ ongewijzigd. */
export const KASSA_SXGA_HEADER_QUICK_LINK_LABEL =
  'whitespace-nowrap text-xs leading-snug sm:text-sm'
export const KASSA_SXGA_HEADER_MENU_LABEL = 'font-bold text-xs leading-tight sm:text-sm'
export const KASSA_SXGA_SIDEBAR_ACTION_LABEL =
  'text-center text-xs font-semibold leading-tight tracking-[0.02em] sm:text-sm'
export const KASSA_SXGA_SIDEBAR_ZONE_LABEL = 'text-sm font-semibold tracking-[0.02em]'
/** Snelmenu-paneel + tafel parkeren — zelfde stap als andere 17″ chrome-labels. */
export const KASSA_SXGA_INLINE_BTN_LABEL =
  'text-xs font-medium leading-tight tracking-[0.01em] sm:text-sm'
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

/** 15″ / 17″: OSK over volle breedte (ook over mand); 21″+ stopt vóór mand. */
export function resolveKassaOskRightInsetPx(
  profile: KassaViewportProfileId,
  sidebarWidthPx: number,
): number {
  if (profile === 'wide15' || profile === 'sxga') return OSK_EDGE_GUTTER_PX
  return sidebarWidthPx + OSK_EDGE_GUTTER_PX
}

const WIDE15: KassaViewportChromeTokens = {
  profile: 'wide15',
  sidebarWidthPx: KASSA_SIDEBAR_WIDTH_WIDE15_PX,
  oskRightInsetPx: resolveKassaOskRightInsetPx('wide15', KASSA_SIDEBAR_WIDTH_WIDE15_PX),
  oskNumpadKeyWidth: resolveKassaOskNumpadKeyWidth('wide15'),
  oskNumpadStripWidth: kassaAzertyOskNumpadStripWidthFromKeyWidth(
    resolveKassaOskNumpadKeyWidth('wide15'),
  ),
  menuGridHorizontalPadPx: 32,
  menuClassicGridCols: 4,
  menuTileHeightBoost: 1.06,
  menuGridGapPx: KASSA_MENU_GRID_GAP_PX_DEFAULT,
  menuVisibleRows: KASSA_MENU_VISIBLE_ROWS_DEFAULT,
  kdsColumnWidthPx: 300,
  kdsColumnCompactTypography: true,
}

const SXGA: KassaViewportChromeTokens = {
  profile: 'sxga',
  sidebarWidthPx: KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX,
  oskRightInsetPx: resolveKassaOskRightInsetPx('sxga', KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX),
  oskNumpadKeyWidth: resolveKassaOskNumpadKeyWidth('sxga'),
  oskNumpadStripWidth: kassaAzertyOskNumpadStripWidthFromKeyWidth(
    resolveKassaOskNumpadKeyWidth('sxga'),
  ),
  menuGridHorizontalPadPx: 32,
  menuClassicGridCols: 5,
  menuTileHeightBoost: KASSA_MENU_TILE_HEIGHT_BOOST_DEFAULT,
  menuGridGapPx: KASSA_MENU_GRID_GAP_PX_DEFAULT,
  menuVisibleRows: KASSA_MENU_VISIBLE_ROWS_DEFAULT,
  kdsColumnWidthPx: 400,
  kdsColumnCompactTypography: false,
}

const DEFAULT_DESKTOP: KassaViewportChromeTokens = {
  profile: 'default',
  sidebarWidthPx: KASSA_SIDEBAR_WIDTH_DEFAULT_LG_PX,
  oskRightInsetPx: resolveKassaOskRightInsetPx('default', KASSA_SIDEBAR_WIDTH_DEFAULT_LG_PX),
  oskNumpadKeyWidth: resolveKassaOskNumpadKeyWidth('default'),
  oskNumpadStripWidth: kassaAzertyOskNumpadStripWidthFromKeyWidth(
    resolveKassaOskNumpadKeyWidth('default'),
  ),
  menuGridHorizontalPadPx: 32,
  menuClassicGridCols: 6,
  menuTileHeightBoost: KASSA_MENU_TILE_HEIGHT_BOOST_DEFAULT,
  menuGridGapPx: KASSA_MENU_GRID_GAP_PX_DEFAULT,
  menuVisibleRows: KASSA_MENU_VISIBLE_ROWS_DEFAULT,
  kdsColumnWidthPx: 400,
  kdsColumnCompactTypography: false,
}

const IPAD_129: KassaViewportChromeTokens = {
  profile: 'ipad_129',
  sidebarWidthPx: 340,
  oskRightInsetPx: resolveKassaOskRightInsetPx('ipad_129', 340),
  oskNumpadKeyWidth: resolveKassaOskNumpadKeyWidth('ipad_129'),
  oskNumpadStripWidth: kassaAzertyOskNumpadStripWidthFromKeyWidth(
    resolveKassaOskNumpadKeyWidth('ipad_129'),
  ),
  menuGridHorizontalPadPx: 32,
  menuClassicGridCols: 4,
  menuTileHeightBoost: KASSA_MENU_TILE_HEIGHT_BOOST_DEFAULT,
  menuGridGapPx: KASSA_MENU_GRID_GAP_PX_DEFAULT,
  menuVisibleRows: KASSA_MENU_VISIBLE_ROWS_DEFAULT,
  kdsColumnWidthPx: 300,
  kdsColumnCompactTypography: true,
}

const IPAD_10: KassaViewportChromeTokens = {
  profile: 'ipad_10',
  sidebarWidthPx: KASSA_SIDEBAR_WIDTH_IPAD_10_PX,
  oskRightInsetPx: resolveKassaOskRightInsetPx('ipad_10', KASSA_SIDEBAR_WIDTH_IPAD_10_PX),
  oskNumpadKeyWidth: resolveKassaOskNumpadKeyWidth('ipad_10'),
  oskNumpadStripWidth: kassaAzertyOskNumpadStripWidthFromKeyWidth(
    resolveKassaOskNumpadKeyWidth('ipad_10'),
  ),
  menuGridHorizontalPadPx: 28,
  menuClassicGridCols: 4,
  menuTileHeightBoost: KASSA_MENU_TILE_HEIGHT_BOOST_DEFAULT,
  menuGridGapPx: 14,
  menuVisibleRows: 3,
  kdsColumnWidthPx: 285,
  kdsColumnCompactTypography: true,
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

export function kitchenKdsLayoutFromProfileId(profileId: KassaViewportProfileId): {
  columnWidthPx: number
  compactTypography: boolean
} {
  const t = getKassaViewportChromeTokens(profileId)
  return {
    columnWidthPx: t.kdsColumnWidthPx,
    compactTypography: t.kdsColumnCompactTypography,
  }
}

export function kassaViewportChromeCssVars(tokens: KassaViewportChromeTokens): Record<string, string> {
  return {
    '--kassa-sidebar-width': `${tokens.sidebarWidthPx}px`,
    '--kassa-osk-right-inset': `${tokens.oskRightInsetPx}px`,
    '--kassa-osk-numpad-key-max-width': tokens.oskNumpadKeyWidth,
    '--kassa-osk-numpad-strip-width': tokens.oskNumpadStripWidth,
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

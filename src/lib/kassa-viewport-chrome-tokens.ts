/**
 * Vaste chrome per kassascherm-profiel — wijzig alleen binnen het betreffende profiel-object.
 * Detectie: `kassa-viewport-profile` + `data-kassa-vp` op de kassa-root.
 */

export type KassaViewportChromeProfile = 'wide15' | 'sxga' | 'default'

export type KassaViewportChromeTokens = {
  profile: KassaViewportChromeProfile
  /** Vaste mandbreedte (px); sync met sidebar Tailwind `w-[…px]`. */
  sidebarWidthPx: number
  /** OSK vast → rechter inset tot start mand. */
  oskRightInsetPx: number
  /** Ruimte voor menu-raster schatting (sidebar + horizontale padding). */
  menuGridHorizontalPadPx: number
  /** Max menu-kolommen (classic grid hint; iPad cap apart). */
  menuClassicGridCols: number
}

/** 17″ SXGA — sync `.cursor/rules/kassa-17inch-sxga.mdc`. */
export const KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX = 332
/** 15″ breedbeeld. */
export const KASSA_SIDEBAR_WIDTH_WIDE15_PX = 268
/** 21″ / grote desktop (lg breakpoint in kassa). */
export const KASSA_SIDEBAR_WIDTH_DEFAULT_LG_PX = 380
export const KASSA_SIDEBAR_WIDTH_DEFAULT_SM_PX = 384
export const KASSA_SIDEBAR_WIDTH_DEFAULT_BASE_PX = 320

const OSK_EDGE_GUTTER_PX = 4

const WIDE15: KassaViewportChromeTokens = {
  profile: 'wide15',
  sidebarWidthPx: KASSA_SIDEBAR_WIDTH_WIDE15_PX,
  oskRightInsetPx: KASSA_SIDEBAR_WIDTH_WIDE15_PX + OSK_EDGE_GUTTER_PX,
  menuGridHorizontalPadPx: 32,
  menuClassicGridCols: 5,
}

const SXGA: KassaViewportChromeTokens = {
  profile: 'sxga',
  sidebarWidthPx: KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX,
  oskRightInsetPx: KASSA_SIDEBAR_WIDTH_SXGA_COMPACT_PX + OSK_EDGE_GUTTER_PX,
  menuGridHorizontalPadPx: 32,
  menuClassicGridCols: 5,
}

const DEFAULT_DESKTOP: KassaViewportChromeTokens = {
  profile: 'default',
  sidebarWidthPx: KASSA_SIDEBAR_WIDTH_DEFAULT_LG_PX,
  oskRightInsetPx: KASSA_SIDEBAR_WIDTH_DEFAULT_LG_PX + OSK_EDGE_GUTTER_PX,
  menuGridHorizontalPadPx: 32,
  menuClassicGridCols: 6,
}

const PROFILE_TABLE: Record<KassaViewportChromeProfile, KassaViewportChromeTokens> = {
  wide15: WIDE15,
  sxga: SXGA,
  default: DEFAULT_DESKTOP,
}

/** Lab + documentatie: kritieke schermen vóór deploy. */
export const KASSA_LAYOUT_REGRESSION_FRAME_IDS = ['15', '17', '21'] as const

export function getKassaViewportChromeTokens(
  profile: KassaViewportChromeProfile,
): KassaViewportChromeTokens {
  return PROFILE_TABLE[profile] ?? DEFAULT_DESKTOP
}

export function kassaViewportChromeCssVars(tokens: KassaViewportChromeTokens): Record<string, string> {
  return {
    '--kassa-sidebar-width': `${tokens.sidebarWidthPx}px`,
    '--kassa-osk-right-inset': `${tokens.oskRightInsetPx}px`,
  }
}

/** Default-profiel: sidebar kan nog op sm/base smaller zijn — alleen voor niet-compact chrome. */
export function estimateKassaSidebarWidthPxForInnerWidth(
  profile: KassaViewportChromeProfile,
  viewportInnerWidth: number,
): number {
  const t = getKassaViewportChromeTokens(profile)
  if (profile === 'wide15' || profile === 'sxga') return t.sidebarWidthPx
  if (viewportInnerWidth >= 1024) return KASSA_SIDEBAR_WIDTH_DEFAULT_LG_PX
  if (viewportInnerWidth >= 640) return KASSA_SIDEBAR_WIDTH_DEFAULT_SM_PX
  return KASSA_SIDEBAR_WIDTH_DEFAULT_BASE_PX
}

import type { KassaLayoutLabFrame } from '@/lib/kassa-layout-preview'

/**
 * Fysieke panelen in de zaak (eigenaar / iiyama 21,5″ spec).
 * Beeldbreedte = diagonaal × aspect uit logische resolutie (viewable, niet chassis).
 */
export const KASSA_LAB_PANEL_DIAGONAL_CM: Record<string, number> = {
  /** iiyama ProLite T2252MSC-B2 — bol: diag 54,6 cm, chassis breed 49,35 cm */
  '21': 54.6,
  '15': 39,
  /** 17″ kiosk vierkant SXGA */
  '17': 43,
}

/** Fallback breedte (cm) zonder diagonaal. */
export const KASSA_LAB_DEFAULT_PANEL_WIDTH_CM: Record<string, number> = {
  '21': 47.5,
  '15': 34,
  '17': 33.6,
  'ipad-mini': 19.3,
  'ipad-10': 20.8,
  'ipad-11': 23.5,
  'ipad-air': 23.4,
  'ipad-pro-11': 23.5,
  'ipad-pro-13': 26.2,
}

/** Viewable breedte uit diagonaal + css aspect. */
export function kassaLabViewableWidthCmFromDiagonal(
  diagonalCm: number,
  cssW: number,
  cssH: number,
): number {
  if (!(diagonalCm > 0 && cssW > 0 && cssH > 0)) return 34.5
  const hyp = Math.sqrt(cssW * cssW + cssH * cssH)
  return Math.round(((diagonalCm * cssW) / hyp) * 10) / 10
}

export function kassaLabDefaultPanelWidthCmForFrame(frame: KassaLayoutLabFrame): number {
  const diag = KASSA_LAB_PANEL_DIAGONAL_CM[frame.id]
  if (diag != null && diag > 0) {
    return kassaLabViewableWidthCmFromDiagonal(diag, frame.cssW, frame.cssH)
  }
  const d = KASSA_LAB_DEFAULT_PANEL_WIDTH_CM[frame.id]
  if (d != null && d > 0) return d
  return 34.5
}

export function kassaLabPhysicalPanelWidthCm(
  frame: KassaLayoutLabFrame,
  overrides?: Record<string, number>,
): number {
  const custom = overrides?.[frame.id]
  if (custom != null && custom > 0) return custom
  return kassaLabDefaultPanelWidthCmForFrame(frame)
}

export function kassaLabPhysicalBoxCm(
  frame: KassaLayoutLabFrame,
  overrides?: Record<string, number>,
): { widthCm: number; heightCm: number } {
  const widthCm = kassaLabPhysicalPanelWidthCm(frame, overrides)
  const heightCm = Math.round(widthCm * (frame.cssH / frame.cssW) * 10) / 10
  return { widthCm, heightCm }
}

/** iframe-scale: fysieke doos (px) ÷ logische kassa-breedte (css px). */
export function labIframeScaleForPhysicalBox(boxWidthPx: number, cssW: number): number {
  if (!(boxWidthPx > 0 && cssW > 0)) return 1
  return boxWidthPx / cssW
}

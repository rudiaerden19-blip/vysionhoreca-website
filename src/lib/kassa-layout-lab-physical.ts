import type { KassaLayoutLabFrame } from '@/lib/kassa-layout-preview'

/**
 * Actieve beeldbreedte op echt paneel (lineaal), niet de CSS-viewport.
 * Pas aan in superadmin-lab als jouw kassa-hardware afwijkt (lineaal op rand preview).
 */
export const KASSA_LAB_DEFAULT_PANEL_WIDTH_CM: Record<string, number> = {
  /** 21–22″ FHD landschap — viewable ~47–48 cm */
  '21': 47.6,
  /** 15–15,6″ 1366×768 */
  '15': 34.5,
  /** 17″ SXGA 1280×1024 (4∶3) — breedte ~33,8 cm, hoogte ~27 cm */
  '17': 33.8,
  'ipad-mini': 19.3,
  'ipad-10': 20.8,
  'ipad-11': 23.5,
  'ipad-air': 23.4,
  'ipad-pro-11': 23.5,
  'ipad-pro-13': 26.2,
}

export function kassaLabPhysicalPanelWidthCm(
  frameId: string,
  overrides?: Record<string, number>,
): number {
  const custom = overrides?.[frameId]
  if (custom != null && custom > 0) return custom
  const d = KASSA_LAB_DEFAULT_PANEL_WIDTH_CM[frameId]
  if (d != null && d > 0) return d
  return 34.5
}

export function kassaLabPhysicalBoxCm(
  frame: KassaLayoutLabFrame,
  overrides?: Record<string, number>,
): { widthCm: number; heightCm: number } {
  const widthCm = kassaLabPhysicalPanelWidthCm(frame.id, overrides)
  const heightCm = widthCm * (frame.cssH / frame.cssW)
  return { widthCm, heightCm }
}

/** iframe-scale: fysieke doos (px) ÷ logische kassa-breedte (css px). */
export function labIframeScaleForPhysicalBox(boxWidthPx: number, cssW: number): number {
  if (!(boxWidthPx > 0 && cssW > 0)) return 1
  return boxWidthPx / cssW
}

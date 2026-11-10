import type { KassaLayoutLabFrame } from '@/lib/kassa-layout-preview'

/**
 * Actieve beeldbreedte op echt paneel (lineaal), niet de CSS-viewport.
 * 15″: eigenaar ~34,5 cm; 21″/17″ typische kassa-panelen — aanpasbaar in lab-ui.
 */
export const KASSA_LAB_DEFAULT_PANEL_WIDTH_CM: Record<string, number> = {
  '21': 47.6,
  '15': 34.5,
  '17': 34,
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

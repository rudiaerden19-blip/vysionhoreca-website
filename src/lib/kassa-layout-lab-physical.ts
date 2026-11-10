import type { KassaLayoutLabFrame } from '@/lib/kassa-layout-preview'

/**
 * Vaste beeldmates hardware (eigenaar) — letterlijk, geen herberekening in UI.
 * 15″ diag 39 cm (breedte gemeten 34,5 cm) · 17″ diag 43 cm vierkant · 21″ diag 54,6 cm iiyama FHD.
 */
export const KASSA_LAB_FIXED_BOX_CM: Record<
  '21' | '15' | '17',
  { widthCm: number; heightCm: number }
> = {
  '15': { widthCm: 34.5, heightCm: 19.4 },
  '17': { widthCm: 33.6, heightCm: 26.9 },
  '21': { widthCm: 47.5, heightCm: 26.7 },
}

export function kassaLabPhysicalBoxCm(
  frame: KassaLayoutLabFrame,
): { widthCm: number; heightCm: number } {
  const fixed = KASSA_LAB_FIXED_BOX_CM[frame.id as keyof typeof KASSA_LAB_FIXED_BOX_CM]
  if (fixed) return fixed
  return { widthCm: 34.5, heightCm: 19.4 }
}

export function labIframeScaleForPhysicalBox(boxWidthPx: number, cssW: number): number {
  if (!(boxWidthPx > 0 && cssW > 0)) return 1
  return boxWidthPx / cssW
}

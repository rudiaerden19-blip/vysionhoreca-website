import type { KassaLayoutLabFrame } from '@/lib/kassa-layout-preview'

/**
 * Vaste fysieke maten kassa-panelen (eigenaar) — alleen 21 / 15 / 17.
 * Geen instellingen in UI; wijzig alleen hier + test.
 */
export const KASSA_LAB_FIXED_DIAGONAL_CM = {
  '21': 54.6,
  '15': 39,
  '17': 43,
} as const

function viewableWidthCmFromDiagonal(diagonalCm: number, cssW: number, cssH: number): number {
  const hyp = Math.sqrt(cssW * cssW + cssH * cssH)
  return Math.round(((diagonalCm * cssW) / hyp) * 10) / 10
}

/** Vaste beeldbreedte/hoogte (cm) voor lab-lineaal. */
export const KASSA_LAB_FIXED_BOX_CM: Record<
  '21' | '15' | '17',
  { widthCm: number; heightCm: number }
> = {
  '21': {
    widthCm: viewableWidthCmFromDiagonal(54.6, 1920, 1080),
    heightCm:
      Math.round(
        viewableWidthCmFromDiagonal(54.6, 1920, 1080) * (1080 / 1920) * 10,
      ) / 10,
  },
  '15': {
    widthCm: viewableWidthCmFromDiagonal(39, 1366, 768),
    heightCm:
      Math.round(viewableWidthCmFromDiagonal(39, 1366, 768) * (768 / 1366) * 10) / 10,
  },
  '17': {
    widthCm: viewableWidthCmFromDiagonal(43, 1280, 1024),
    heightCm:
      Math.round(viewableWidthCmFromDiagonal(43, 1280, 1024) * (1024 / 1280) * 10) / 10,
  },
}

export function kassaLabPhysicalBoxCm(
  frame: KassaLayoutLabFrame,
): { widthCm: number; heightCm: number } {
  const fixed = KASSA_LAB_FIXED_BOX_CM[frame.id as keyof typeof KASSA_LAB_FIXED_BOX_CM]
  if (fixed) return fixed
  const diag = KASSA_LAB_FIXED_DIAGONAL_CM[frame.id as keyof typeof KASSA_LAB_FIXED_DIAGONAL_CM]
  if (diag) {
    const widthCm = viewableWidthCmFromDiagonal(diag, frame.cssW, frame.cssH)
    return {
      widthCm,
      heightCm: Math.round(widthCm * (frame.cssH / frame.cssW) * 10) / 10,
    }
  }
  return { widthCm: 34, heightCm: 19.1 }
}

export function labIframeScaleForPhysicalBox(boxWidthPx: number, cssW: number): number {
  if (!(boxWidthPx > 0 && cssW > 0)) return 1
  return boxWidthPx / cssW
}

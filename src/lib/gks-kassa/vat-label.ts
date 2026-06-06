import type { GksVatLabel } from '@/lib/gks-kassa/fdm-types'

/** MB btw-codes — tarieven door FDM; label op productlijn. */
export function vatPercentToGksLabel(percent: number): GksVatLabel {
  const p = Math.round(percent)
  if (p >= 20) return 'A'
  if (p >= 11) return 'B'
  if (p >= 5) return 'C'
  if (p === 0) return 'D'
  return 'X'
}

const RATE_BY_LABEL: Record<GksVatLabel, number> = {
  A: 21,
  B: 12,
  C: 6,
  D: 0,
  X: 0,
}

/** Mock vatCalc — productie komt van FDM. */
export function mockVatCalcFromLines(
  lines: { label: GksVatLabel; gross: number }[],
): import('@/lib/gks-kassa/fdm-types').GksVatCalcItem[] {
  const byLabel = new Map<GksVatLabel, number>()
  for (const l of lines) {
    byLabel.set(l.label, (byLabel.get(l.label) ?? 0) + l.gross)
  }
  const out: import('@/lib/gks-kassa/fdm-types').GksVatCalcItem[] = []
  for (const [label, gross] of byLabel) {
    if (label === 'X' || label === 'D') {
      out.push({
        label,
        rate: RATE_BY_LABEL[label],
        taxableAmount: gross,
        vatAmount: 0,
        totalAmount: gross,
        outOfScope: label === 'X',
      })
      continue
    }
    const rate = RATE_BY_LABEL[label]
    const taxableAmount = Math.round((gross / (1 + rate / 100)) * 100) / 100
    const vatAmount = Math.round((gross - taxableAmount) * 100) / 100
    out.push({
      label,
      rate,
      taxableAmount,
      vatAmount,
      totalAmount: gross,
      outOfScope: false,
    })
  }
  return out
}

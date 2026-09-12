/** 80 mm thermische regel in normale/DOUBLE_HEIGHT ESC/POS (~42 tekens). */
export const KASSA_THERMAL_LINE_WIDTH = 42

/**
 * Product/label links, `EUR 0.00` tegen de rechterkant.
 * Alleen ASCII-spaties — zelfde patroon als de Print Agent `padPrice`.
 */
export function formatKassaThermalPriceRow(
  left: string,
  amount: number,
  width = KASSA_THERMAL_LINE_WIDTH,
): string {
  const right = `EUR ${Number(amount).toFixed(2)}`
  const maxLeft = Math.max(1, width - right.length - 1)
  let label = String(left ?? '')
  if (label.length > maxLeft) label = label.slice(0, maxLeft)
  const pad = Math.max(1, width - label.length - right.length)
  return `${label}${' '.repeat(pad)}${right}`
}

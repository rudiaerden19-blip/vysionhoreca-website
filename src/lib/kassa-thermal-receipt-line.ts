/** 80 mm thermische regel in normale/DOUBLE_HEIGHT ESC/POS (~42 tekens). */
export const KASSA_THERMAL_LINE_WIDTH = 42

/**
 * Product/label links, `EUR 0.00` tegen de rechterkant.
 * Punten i.p.v. spaties: de Print Agent plakt spaties weer aan elkaar,
 * en T100/Chinese firmware toont een spatieblok vaak niet als breedte.
 */
export function formatKassaThermalPriceRow(
  left: string,
  amount: number,
  width = KASSA_THERMAL_LINE_WIDTH,
): string {
  const right = `EUR ${Number(amount).toFixed(2)}`
  const maxLeft = Math.max(1, width - right.length - 3)
  let label = String(left ?? '')
  if (label.length > maxLeft) label = label.slice(0, maxLeft)
  const fill = Math.max(1, width - label.length - right.length - 2)
  return `${label} ${'.'.repeat(fill)} ${right}`
}

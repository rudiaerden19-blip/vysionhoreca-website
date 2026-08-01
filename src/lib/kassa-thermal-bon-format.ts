/** Zelfde breedte als lokale Print Agent ESC/POS (80mm). */
export const KASSA_THERMAL_RECEIPT_W = 42

const THERMAL_FILL = '.'

function formatEuroThermal(amount: number): string {
  return `EUR ${amount.toFixed(2)}`
}

/** Omschrijving links, bedrag rechts (dot leaders — agent-safe). */
export function kassaThermalRightAlignLine(left: string, right: string): string {
  const l = left.trimEnd()
  const r = right.trim()
  const targetCol = KASSA_THERMAL_RECEIPT_W - r.length
  if (targetCol <= 0) return r.slice(0, KASSA_THERMAL_RECEIPT_W)
  if (l.length >= targetCol) {
    return `${l.slice(0, Math.max(0, targetCol - 1))}${THERMAL_FILL}${r}`.slice(0, KASSA_THERMAL_RECEIPT_W)
  }
  const fillLen = Math.max(1, targetCol - l.length)
  const line = l + THERMAL_FILL.repeat(fillLen) + r
  return line.length > KASSA_THERMAL_RECEIPT_W ? line.slice(0, KASSA_THERMAL_RECEIPT_W) : line
}

export function kassaThermalPadMoney(left: string, amount: number): string {
  return kassaThermalRightAlignLine(left, formatEuroThermal(amount))
}

/** Agent herkent `Nx …` voor extra regelafstand tussen artikelen. */
export function kassaThermalItemLine(qty: number, name: string, lineTotal: number): string {
  const price = formatEuroThermal(lineTotal)
  const targetCol = KASSA_THERMAL_RECEIPT_W - price.length
  const prefix = `${qty}x `
  let productName = name.trim()
  const maxNameLen = Math.max(1, targetCol - prefix.length - 1)
  if (productName.length > maxNameLen) {
    productName = `${productName.slice(0, Math.max(1, maxNameLen - 1))}.`
  }
  return kassaThermalRightAlignLine(`${prefix}${productName}`, price)
}

export function kassaThermalTotalLine(totalLabel: string, amount: number): string {
  return kassaThermalPadMoney(totalLabel.trim().toUpperCase(), amount)
}

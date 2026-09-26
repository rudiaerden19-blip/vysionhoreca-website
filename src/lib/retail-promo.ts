/** Koop X, Y gratis. Leeg of ongeldig = geen promo. */

export type RetailPromo = { buy: number; free: number }

export function parseRetailPromo(buyRaw: unknown, freeRaw: unknown): RetailPromo | null {
  const buy = Math.floor(Number(buyRaw))
  const free = Math.floor(Number(freeRaw))
  if (!Number.isFinite(buy) || !Number.isFinite(free)) return null
  if (buy < 1 || free < 1) return null
  if (buy > 99 || free > 99) return null
  return { buy, free }
}

/** Aantal stuks dat gratis is. Bij 2+1 en aantal 3 is dat 1. */
export function retailPromoFreeCount(quantity: number, promo: RetailPromo | null): number {
  const qty = Math.max(0, Math.floor(Number(quantity) || 0))
  if (!promo || qty <= 0) return 0
  const group = promo.buy + promo.free
  return Math.floor(qty / group) * promo.free
}

/** Te betalen stukprijs × (aantal − gratis). Voorraad blijft het echte aantal. */
export function retailPromoChargeableTotal(
  unitPrice: number,
  quantity: number,
  promo: RetailPromo | null,
  choicesTotal = 0,
): number {
  const qty = Math.max(0, Math.floor(Number(quantity) || 0))
  const free = retailPromoFreeCount(qty, promo)
  const payQty = Math.max(0, qty - free)
  const unit = (Number(unitPrice) || 0) + (Number(choicesTotal) || 0)
  return Math.round(payQty * unit * 100) / 100
}

export function formatRetailPromoReceiptNote(
  buy: number,
  free: number,
  freeQty: number,
  templates: { thirdFree: string; line: string },
): string {
  if (buy === 2 && free === 1 && freeQty === 1) return templates.thirdFree
  return templates.line
    .replace('{buy}', String(buy))
    .replace('{free}', String(free))
    .replace('{count}', String(freeQty))
}

export function retailItemPromoNote(
  product: { price?: number; retail_promo_buy?: number | null; retail_promo_free?: number | null },
  quantity: number,
  choicesTotal: number,
  templates: { thirdFree: string; line: string },
): { payable: number; note: string | null } {
  const promo = parseRetailPromo(product.retail_promo_buy, product.retail_promo_free)
  const payable = retailPromoChargeableTotal(Number(product.price) || 0, quantity, promo, choicesTotal)
  const freeQty = retailPromoFreeCount(quantity, promo)
  if (!promo || freeQty < 1) return { payable, note: null }
  return {
    payable,
    note: formatRetailPromoReceiptNote(promo.buy, promo.free, freeQty, templates),
  }
}

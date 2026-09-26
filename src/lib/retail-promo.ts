/** Koop X, Y gratis. Leeg of ongeldig = geen promo. Datums leeg = altijd. Partner = tweede artikel telt mee. */

export type RetailPromo = { buy: number; free: number }

export type RetailPromoCartLine = {
  key: string
  productId: string
  unitPrice: number
  quantity: number
  promoBuy?: number | null
  promoFree?: number | null
  promoFrom?: string | null
  promoUntil?: string | null
  promoPartnerId?: string | null
}

export type RetailPromoCharge = { payable: number; freeQty: number }

export function retailPromoToday(now = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${z(now.getMonth() + 1)}-${z(now.getDate())}`
}

export function retailPromoIsActive(
  fromRaw: string | null | undefined,
  untilRaw: string | null | undefined,
  today = retailPromoToday(),
): boolean {
  const from = (fromRaw || '').slice(0, 10)
  const until = (untilRaw || '').slice(0, 10)
  if (from && today < from) return false
  if (until && today > until) return false
  return true
}

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
  product: {
    price?: number
    retail_promo_buy?: number | null
    retail_promo_free?: number | null
    retail_promo_free_assigned?: number | null
  },
  quantity: number,
  choicesTotal: number,
  templates: { thirdFree: string; line: string },
): { payable: number; note: string | null } {
  const promo = parseRetailPromo(product.retail_promo_buy, product.retail_promo_free)
  const qty = Math.max(0, Math.floor(Number(quantity) || 0))
  const unit = (Number(product.price) || 0) + (Number(choicesTotal) || 0)
  if (typeof product.retail_promo_free_assigned === 'number') {
    const freeQty = Math.min(qty, Math.max(0, Math.floor(product.retail_promo_free_assigned)))
    const payable = Math.round((qty - freeQty) * unit * 100) / 100
    if (!promo || freeQty < 1) return { payable, note: null }
    return {
      payable,
      note: formatRetailPromoReceiptNote(promo.buy, promo.free, freeQty, templates),
    }
  }
  const payable = retailPromoChargeableTotal(Number(product.price) || 0, quantity, promo, choicesTotal)
  const freeQty = retailPromoFreeCount(quantity, promo)
  if (!promo || freeQty < 1) return { payable, note: null }
  return {
    payable,
    note: formatRetailPromoReceiptNote(promo.buy, promo.free, freeQty, templates),
  }
}

function lineQty(line: RetailPromoCartLine): number {
  return Math.max(0, Math.floor(Number(line.quantity) || 0))
}

/** Gratis stuks naar de goedkoopste eenheden. Twee artikelen met dezelfde koppeling tellen samen. */
export function allocateRetailPromoCharges(
  lines: RetailPromoCartLine[],
  today = retailPromoToday(),
): Map<string, RetailPromoCharge> {
  const out = new Map<string, RetailPromoCharge>()
  for (const line of lines) {
    out.set(line.key, {
      payable: Math.round(lineQty(line) * (Number(line.unitPrice) || 0) * 100) / 100,
      freeQty: 0,
    })
  }

  const used = new Set<string>()
  for (const anchor of lines) {
    if (used.has(anchor.key)) continue
    if (!retailPromoIsActive(anchor.promoFrom, anchor.promoUntil, today)) continue
    const promo = parseRetailPromo(anchor.promoBuy, anchor.promoFree)
    if (!promo) continue

    const group = [anchor]
    used.add(anchor.key)
    const partnerId = anchor.promoPartnerId || null
    for (const other of lines) {
      if (used.has(other.key)) continue
      const sameArticle = !partnerId && other.productId === anchor.productId && !other.promoPartnerId
      const paired =
        !!partnerId &&
        (other.productId === partnerId ||
          other.productId === anchor.productId ||
          other.promoPartnerId === anchor.productId)
      if (!sameArticle && !paired) continue
      if (sameArticle) {
        const otherPromo = parseRetailPromo(other.promoBuy, other.promoFree)
        if (
          !otherPromo ||
          otherPromo.buy !== promo.buy ||
          otherPromo.free !== promo.free ||
          !retailPromoIsActive(other.promoFrom, other.promoUntil, today)
        ) {
          continue
        }
      }
      group.push(other)
      used.add(other.key)
    }

    const totalQty = group.reduce((sum, line) => sum + lineQty(line), 0)
    const freeSlots = retailPromoFreeCount(totalQty, promo)
    const units: { key: string; price: number }[] = []
    for (const line of group) {
      const price = Number(line.unitPrice) || 0
      for (let i = 0; i < lineQty(line); i++) units.push({ key: line.key, price })
    }
    units.sort((a, b) => a.price - b.price || a.key.localeCompare(b.key))
    const freeByKey = new Map<string, number>()
    for (let i = 0; i < freeSlots && i < units.length; i++) {
      freeByKey.set(units[i].key, (freeByKey.get(units[i].key) || 0) + 1)
    }
    for (const line of group) {
      const freeQty = freeByKey.get(line.key) || 0
      const payQty = lineQty(line) - freeQty
      out.set(line.key, {
        freeQty,
        payable: Math.round(payQty * (Number(line.unitPrice) || 0) * 100) / 100,
      })
    }
  }

  return out
}

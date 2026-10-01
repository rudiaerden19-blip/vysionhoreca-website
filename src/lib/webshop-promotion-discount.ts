import type { Promotion } from '@/lib/admin-api'

export type WebshopCartLineForPromo = {
  id: string
  /** Basisprijs product per stuk (zonder sauzen/opties). */
  price?: number
  totalPrice: number
  quantity: number
}

function promoIsCurrentlyValid(promo: Promotion, subtotal: number, now: Date): boolean {
  if (promo.is_active === false) return false
  if (promo.min_order_amount && subtotal < promo.min_order_amount) return false
  if (promo.expires_at && new Date(promo.expires_at) < now) return false
  if (promo.starts_at && new Date(promo.starts_at) > now) return false
  return true
}

/** Alleen het product — opties (saus, …) blijven vol tarief. */
function lineBaseSubtotal(line: WebshopCartLineForPromo): number {
  const unitBase =
    line.price != null && Number.isFinite(line.price) ? line.price : line.totalPrice
  return Math.max(0, unitBase) * line.quantity
}

function discountOnProductBase(promo: Promotion, baseSubtotal: number, lineQty: number): number {
  if (baseSubtotal <= 0 || lineQty <= 0) return 0
  if (promo.type === 'percentage') {
    let d = baseSubtotal * (Number(promo.value) / 100)
    if (promo.max_discount != null) d = Math.min(d, promo.max_discount)
    return d
  }
  if (promo.type === 'fixed') {
    return Math.min(Number(promo.value), baseSubtotal)
  }
  if (promo.type === 'fixedPrice') {
    const targetBase = Number(promo.value) * lineQty
    return Math.max(0, baseSubtotal - targetBase)
  }
  return 0
}

/**
 * Automatische korting uit actieve tenant-promoties (geen kortingscode).
 * Percentage/fixed/fixedPrice: alleen op gekoppeld product_id, korting op basisprijs — geen opties, geen andere artikelen.
 */
export function calculateAutomaticPromotionDiscount(
  cart: WebshopCartLineForPromo[],
  promotions: Promotion[],
  subtotal: number,
  tenantSlug: string,
  now: Date = new Date(),
): number {
  const tenant = tenantSlug.trim()
  if (!tenant || !promotions.length || subtotal <= 0 || cart.length === 0) return 0

  let totalDiscount = 0

  for (const promo of promotions) {
    if (promo.tenant_slug !== tenant) continue
    if (!promoIsCurrentlyValid(promo, subtotal, now)) continue

    if (!promo.product_id) {
      // Geen auto-korting op hele mand — voorkomt 50% op snacks; order-korting via kortingscode.
      continue
    }

    const matching = cart.filter((line) => line.id === promo.product_id)
    const baseSubtotal = matching.reduce((s, line) => s + lineBaseSubtotal(line), 0)
    const lineQty = matching.reduce((s, line) => s + line.quantity, 0)
    totalDiscount += discountOnProductBase(promo, baseSubtotal, lineQty)
  }

  return Math.min(Math.round(totalDiscount * 100) / 100, subtotal)
}

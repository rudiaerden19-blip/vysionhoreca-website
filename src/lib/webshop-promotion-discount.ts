import type { Promotion } from '@/lib/admin-api'

export type WebshopCartLineForPromo = {
  id: string
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

function discountForLineSubtotal(promo: Promotion, lineSubtotal: number, lineQty: number): number {
  if (lineSubtotal <= 0) return 0
  if (promo.type === 'percentage') {
    let d = lineSubtotal * (Number(promo.value) / 100)
    if (promo.max_discount != null) d = Math.min(d, promo.max_discount)
    return d
  }
  if (promo.type === 'fixed') {
    return Math.min(Number(promo.value), lineSubtotal)
  }
  if (promo.type === 'fixedPrice') {
    const target = Number(promo.value) * lineQty
    return Math.max(0, lineSubtotal - target)
  }
  return 0
}

/**
 * Automatische korting uit actieve tenant-promoties (geen kortingscode).
 * Promoties zijn altijd al gefilterd op tenant_slug door de caller.
 */
export function calculateAutomaticPromotionDiscount(
  cart: WebshopCartLineForPromo[],
  promotions: Promotion[],
  subtotal: number,
  now: Date = new Date(),
): number {
  if (!promotions.length || subtotal <= 0 || cart.length === 0) return 0

  let totalDiscount = 0

  for (const promo of promotions) {
    if (!promoIsCurrentlyValid(promo, subtotal, now)) continue

    if (promo.product_id) {
      const matching = cart.filter((line) => line.id === promo.product_id)
      const lineSubtotal = matching.reduce((s, line) => s + line.totalPrice * line.quantity, 0)
      const lineQty = matching.reduce((s, line) => s + line.quantity, 0)
      totalDiscount += discountForLineSubtotal(promo, lineSubtotal, lineQty)
      continue
    }

    if (promo.type === 'percentage') {
      let d = subtotal * (Number(promo.value) / 100)
      if (promo.max_discount != null) d = Math.min(d, promo.max_discount)
      totalDiscount += d
    } else if (promo.type === 'fixed') {
      totalDiscount += Math.min(Number(promo.value), subtotal)
    }
  }

  return Math.min(Math.round(totalDiscount * 100) / 100, subtotal)
}

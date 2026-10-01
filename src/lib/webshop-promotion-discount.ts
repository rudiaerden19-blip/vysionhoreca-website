import type { Promotion } from '@/lib/admin-api'

export type WebshopCartLineForPromo = {
  id: string
  /** Basisprijs product per stuk (zonder sauzen/opties). */
  price?: number
  totalPrice: number
  quantity: number
}

export function normalizePromoProductId(id: string | undefined | null): string {
  return (id ?? '').trim().toLowerCase()
}

/** Admin date input (YYYY-MM-DD) → geldig t/m einde van die kalenderdag UTC. */
export function parsePromotionExpiryDate(expiresAt: string | undefined | null): Date | null {
  if (!expiresAt?.trim()) return null
  const t = expiresAt.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return new Date(`${t}T23:59:59.999Z`)
  }
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d
}

export function promotionExpiresAtEndOfDayIso(dateYmd: string): string {
  const t = dateYmd.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return `${t}T23:59:59.999Z`
  }
  return t
}

function promoIsCurrentlyValid(promo: Promotion, subtotal: number, now: Date): boolean {
  if (promo.is_active === false) return false
  if (promo.min_order_amount && subtotal < promo.min_order_amount) return false
  const exp = parsePromotionExpiryDate(promo.expires_at)
  if (exp && exp < now) return false
  if (promo.starts_at) {
    const start = new Date(promo.starts_at)
    if (!Number.isNaN(start.getTime()) && start.getTime() > now.getTime() + 1000) return false
  }
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

function cartLinesForPromo(cart: WebshopCartLineForPromo[], productId: string): WebshopCartLineForPromo[] {
  const want = normalizePromoProductId(productId)
  if (!want) return []
  return cart.filter((line) => normalizePromoProductId(line.id) === want)
}

/**
 * Automatische korting uit actieve tenant-promoties (geen kortingscode).
 * Alleen promoties met product_id voor die tenant; korting op basisprijs van dat product.
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

    const productId = promo.product_id?.trim()
    if (!productId) continue

    const matching = cartLinesForPromo(cart, productId)
    const baseSubtotal = matching.reduce((s, line) => s + lineBaseSubtotal(line), 0)
    const lineQty = matching.reduce((s, line) => s + line.quantity, 0)
    totalDiscount += discountOnProductBase(promo, baseSubtotal, lineQty)
  }

  return Math.min(Math.round(totalDiscount * 100) / 100, subtotal)
}

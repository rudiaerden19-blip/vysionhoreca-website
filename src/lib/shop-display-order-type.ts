/**
 * Maps raw `orders.order_type` to shop display / kitchen UI translation keys.
 * Webshop: `delivery` | `pickup`. Kassa POS: `DELIVERY` | `DINE_IN` | `TAKEAWAY`.
 */
export type ShopDisplayOrderTypeKey = 'delivery' | 'dineIn' | 'pickup'

function normU(ot: string | null | undefined) {
  return (ot || '').toString().toUpperCase()
}

export function shopDisplayOrderTypeKey(orderType: string | null | undefined): ShopDisplayOrderTypeKey {
  const raw = (orderType || '').toString()
  const u = normU(raw)
  if (raw === 'delivery' || u === 'DELIVERY') return 'delivery'
  if (u === 'DINE_IN') return 'dineIn'
  return 'pickup'
}

/** Fixed Dutch strings for browser print HTML (thermal uses raw order_type on device). */
export function nlBrowserPrintOrderTypeBanner(orderType: string | null | undefined): string {
  const k = shopDisplayOrderTypeKey(orderType)
  if (k === 'delivery') return '🚗 LEVERING'
  if (k === 'dineIn') return '🍽️ TER PLAATSE'
  if (normU(orderType) === 'TAKEAWAY') return '📦 AFHALEN'
  return '🛍️ AFHALEN'
}

/**
 * Order shape and pure helpers (POS vs webshop, Z-rapport payment buckets).
 * Consumed by admin-api; re-exported from `@/lib/admin-api` for callers.
 */

export interface OrderItem {
  id?: string
  order_id?: string
  tenant_slug: string
  product_id?: string
  product_name: string
  quantity: number
  unit_price: number
  options_json?: Record<string, unknown>
  options_price: number
  total_price: number
  notes?: string
}

export interface Order {
  id?: string
  tenant_slug: string
  business_id?: string
  order_number?: number
  customer_name: string
  customer_phone?: string
  customer_email?: string
  customer_address?: string
  customer_notes?: string
  order_type?: 'pickup' | 'delivery' | string
  status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled' | 'rejected' | string
  delivery_address?: string
  delivery_notes?: string
  subtotal: number
  delivery_fee?: number
  discount_amount?: number
  discount_code?: string
  tax?: number
  total: number
  payment_method?: string
  /** Kassa gesplitste betaling (EUR); alleen bij payment_method SPLIT */
  payment_split_cash?: number | null
  payment_split_card?: number | null
  /** Idempotente checkout-sleutel (kassa offline retry) */
  kassa_client_uuid?: string | null
  payment_status?: string
  requested_date?: string
  requested_time?: string
  scheduled_date?: string
  scheduled_time?: string
  estimated_ready_time?: string
  completed_at?: string
  confirmed_at?: string
  rejected_at?: string
  rejection_reason?: string
  rejection_notes?: string
  created_at?: string
  updated_at?: string
  /** Dine-in: zaal voor rapportage/trace (inside | terrace); DB default inside */
  floor_plan_zone?: string | null
  table_number?: string | number | null
  // Items stored as JSONB in database
  items?: OrderItem[] | { name: string; quantity: number; price: number }[]
}

/** Alleen deze drie komen uit de fysieke kassa-POS. Alles anders (pickup, delivery, leeg, …) = webshop/online. */
export function isKassaPosOrder(order: Pick<Order, 'order_type'>): boolean {
  const t = (order.order_type || '').toString()
  return t === 'DINE_IN' || t === 'TAKEAWAY' || t === 'DELIVERY'
}

/** Webshop of online kanaal — niet de kassa-POS. */
export function isWebshopOrder(order: Pick<Order, 'order_type'>): boolean {
  return !isKassaPosOrder(order)
}

/**
 * Omzet splitsen POS-kassa vs webshop — Z-rapport, rapporten-tab, exports.
 * Zelfde bron als dashboard (`isKassaPosOrder`).
 */
export function aggregateOrderTotalsKassaVsOnline<T extends Pick<Order, 'order_type' | 'total'>>(
  orders: T[],
): {
  kassaSalesTotal: number
  onlineSalesTotal: number
  kassaOrderCount: number
  onlineOrderCount: number
} {
  let kassaSum = 0
  let onlineSum = 0
  let kassaOrderCount = 0
  let onlineOrderCount = 0
  for (const o of orders) {
    const tot = Number(o.total) || 0
    if (isKassaPosOrder(o)) {
      kassaSum += tot
      kassaOrderCount++
    } else {
      onlineSum += tot
      onlineOrderCount++
    }
  }
  const grand = Math.round((kassaSum + onlineSum) * 100) / 100
  let kassaSalesTotal = Math.round(kassaSum * 100) / 100
  let onlineSalesTotal = Math.round(onlineSum * 100) / 100
  const splitSum = Math.round((kassaSalesTotal + onlineSalesTotal) * 100) / 100
  const drift = Math.round((grand - splitSum) * 100) / 100
  if (drift !== 0) {
    if (kassaSalesTotal >= onlineSalesTotal) {
      kassaSalesTotal = Math.round((kassaSalesTotal + drift) * 100) / 100
    } else {
      onlineSalesTotal = Math.round((onlineSalesTotal + drift) * 100) / 100
    }
  }
  return { kassaSalesTotal, onlineSalesTotal, kassaOrderCount, onlineOrderCount }
}

/**
 * Orders met status `new` die van het publieke web / groepsmodule komen.
 * Kassa-POS schrijft bij verkoop direct `confirmed` — die horen dit alarm niet te triggeren.
 * Let op: `.toLowerCase()` alleen is onvoldoende (`DELIVERY` zou `delivery` worden); daarom eerst POS uitsluiten.
 */
export function isWebshopChannelNewOrder(order: { order_type?: string | null | undefined }): boolean {
  if (isKassaPosOrder({ order_type: order.order_type ?? '' } as Pick<Order, 'order_type'>)) return false
  const ot = String(order.order_type ?? '').toLowerCase().trim()
  return ot === 'pickup' || ot === 'delivery' || ot === 'group'
}

/**
 * Dashboard, Z-rapport, rapporten, bedrijfsanalyse, verkoop: zelfde bron van waarheid.
 *
 * - Webshop/online: telt zodra de zaak bevestigt (confirmed+) OF zodra online betaald (paid) — niet pas bij "afronden".
 * - Fysieke kassa (POS): telt zodra op "Betalen" (payment_status paid).
 * - Geannuleerd / geweigerd: nooit.
 */
export function orderCountsTowardRevenueAndZReport(
  order: Pick<Order, 'order_type' | 'status' | 'payment_status'>
): boolean {
  const st = (order.status || '').toString().toLowerCase()
  if (['cancelled', 'rejected'].includes(st)) return false
  if (isWebshopOrder(order)) {
    if (['confirmed', 'preparing', 'ready', 'completed', 'delivered'].includes(st)) {
      return true
    }
    const ps = (order.payment_status || '').toString().toLowerCase()
    if (ps === 'paid') return true
    return false
  }
  return (order.payment_status || '').toString().toLowerCase() === 'paid'
}

/** Zelfde indeling als Z-rapport / omzet: contant, kaart, overig (online), gesplitst. */
export type OrderPaymentBucket = 'cash' | 'card' | 'online' | 'split'

export function orderPaymentMethodBucket(order: Pick<Order, 'payment_method'>): OrderPaymentBucket {
  const pm = (order.payment_method || '').toLowerCase()
  if (pm === 'split') return 'split'
  if (pm === 'cash' || pm === 'contant') return 'cash'
  if (pm === 'card' || pm === 'pin' || pm === 'kaart') return 'card'
  return 'online'
}

/**
 * Verdeelt één order over Z-rapport / kasbuckets (contant, kaart, online).
 * Gesplitste kassa-betalingen gebruiken payment_split_*; anders payment_method + totaal.
 */
export function distributeOrderPaymentForZRaport(order: {
  total?: unknown
  payment_method?: unknown
  payment_split_cash?: unknown
  payment_split_card?: unknown
}): { cash: number; card: number; online: number } {
  const orderTotal = Number(order.total) || 0
  const pm = String(order.payment_method || '').toLowerCase()
  if (pm === 'split') {
    const sc = Number(order.payment_split_cash)
    const sd = Number(order.payment_split_card)
    if (Number.isFinite(sc) && Number.isFinite(sd)) {
      return { cash: sc, card: sd, online: 0 }
    }
  }
  if (pm === 'cash' || pm === 'contant') {
    return { cash: orderTotal, card: 0, online: 0 }
  }
  if (pm === 'card' || pm === 'pin' || pm === 'kaart') {
    return { cash: 0, card: orderTotal, online: 0 }
  }
  return { cash: 0, card: 0, online: orderTotal }
}

import type { MenuProduct } from '@/lib/admin-api'
import type { KassaCartItem, KassaSelectedChoice } from '@/lib/kassa-cart-types'

function minimalMenuProduct(id: string, name: string, price: number): MenuProduct {
  return { id, name, price } as MenuProduct
}
import type { FloorPlanZone } from '@/lib/kassa-floor-plan-zone'
import { gksCommercialOrders } from '@/lib/gks-kassa/commercial-orders-client'

export type GksOpenTableOrderRow = {
  table_number: string | null
  items: unknown
  floor_plan_zone?: string | null
  order_type?: string | null
  status?: string | null
  payment_status?: string | null
}

export function isGksDineInOpenTableDraftRow(row: GksOpenTableOrderRow): boolean {
  if (String(row.order_type || '').toUpperCase() !== 'DINE_IN') return false
  if (row.table_number == null || String(row.table_number).trim() === '') return false
  const st = String(row.status || '').toLowerCase()
  if (!['open', 'preparing'].includes(st)) return false
  if (String(row.payment_status || '').toLowerCase() === 'paid') return false
  return true
}

export function cartItemsToGksCommercialItems(items: KassaCartItem[]): Record<string, unknown>[] {
  return items.map((i) => ({
    product_id: i.product.id,
    name: i.product.name,
    price: i.product.price,
    quantity: i.quantity,
    choices: i.choices,
    cartKey: i.cartKey,
  }))
}

/** DB-items (plat JSON) → mandregels met `product` voor kassa-UI. */
export function normalizeGksCommercialItemsToCartLines(items: unknown): KassaCartItem[] {
  if (!Array.isArray(items)) return []
  const out: KassaCartItem[] = []
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const nested = r.product
    if (nested && typeof nested === 'object') {
      const p = nested as { id?: string; name?: string; price?: number }
      if (p.name != null && typeof p.price === 'number') {
        out.push({
          product: minimalMenuProduct(
            p.id ?? String(r.product_id ?? 'item'),
            String(p.name),
            p.price,
          ),
          quantity: Number(r.quantity) || 1,
          choices: Array.isArray(r.choices) ? (r.choices as KassaSelectedChoice[]) : [],
          cartKey: String(r.cartKey ?? p.id ?? 'line'),
        })
        continue
      }
    }
    const name = String(r.name ?? 'Item')
    const price = Number(r.price) || 0
    const productId = String(r.product_id ?? `gks-${name}`)
    out.push({
      product: minimalMenuProduct(productId, name, price),
      quantity: Number(r.quantity) || 1,
      choices: Array.isArray(r.choices) ? (r.choices as KassaSelectedChoice[]) : [],
      cartKey: String(r.cartKey ?? productId),
    })
  }
  return out
}

export async function fetchGksOpenTableOrdersForTenant(
  tenantSlug: string,
): Promise<GksOpenTableOrderRow[] | null> {
  const res = await gksCommercialOrders.select<GksOpenTableOrderRow[]>(tenantSlug, {
    statusIn: ['open', 'preparing'],
    limit: 500,
  })
  if (!res.ok) {
    console.warn('[gks-kassa] open commercial orders read failed:', res.error)
    return null
  }
  const rows = Array.isArray(res.data) ? res.data : []
  return rows.filter(isGksDineInOpenTableDraftRow)
}

export async function gksDeleteOpenTableCommercialOrders(
  tenantSlug: string,
  zone: FloorPlanZone,
  tableNr: string,
): Promise<void> {
  for (const status of ['open', 'preparing'] as const) {
    const del = await gksCommercialOrders.delete(tenantSlug, {
      table_number: tableNr,
      floor_plan_zone: zone,
      status,
    })
    if (!del.ok) {
      console.warn('[gks-kassa] open commercial delete failed:', del.error)
    }
  }
}

export async function gksPersistOpenTableCommercialOrder(
  tenantSlug: string,
  zone: FloorPlanZone,
  tableNr: string,
  items: KassaCartItem[],
  customerTableLabel: string,
): Promise<string | null> {
  if (items.length === 0) {
    await gksDeleteOpenTableCommercialOrders(tenantSlug, zone, tableNr)
    return null
  }

  const rowPayload: Record<string, unknown> = {
    order_number: 0,
    status: 'open',
    payment_status: 'pending',
    order_type: 'DINE_IN',
    customer_name: customerTableLabel,
    customer_notes: customerTableLabel,
    table_number: tableNr,
    floor_plan_zone: zone,
    subtotal: 0,
    tax: 0,
    total: 0,
    items: cartItemsToGksCommercialItems(items),
  }

  const sel = await gksCommercialOrders.select<{ id: string }[]>(tenantSlug, {
    statusIn: ['open', 'preparing'],
    match: { table_number: tableNr, floor_plan_zone: zone },
    limit: 20,
  })
  const ids =
    sel.ok && Array.isArray(sel.data) ? sel.data.map((r) => r.id).filter(Boolean) : []

  if (ids.length === 1) {
    const up = await gksCommercialOrders.update(tenantSlug, rowPayload, {
      id: ids[0],
    })
    if (up.ok) return ids[0]
    console.warn('[gks-kassa] open commercial update failed, replace:', up.error)
  }

  await gksDeleteOpenTableCommercialOrders(tenantSlug, zone, tableNr)

  for (let attempt = 0; attempt < 3; attempt++) {
    const ins = await gksCommercialOrders.insert<{ id?: string }>(tenantSlug, rowPayload, 'id')
    if (ins.ok && ins.data?.id) return ins.data.id
    if (ins.ok) return null
    console.warn('[gks-kassa] open commercial insert failed:', ins.error)
    const errMsg = ins.error || ''
    const uniqueOrConflict = ins.status === 409 || /duplicate|unique|23505/i.test(errMsg)
    const retryable =
      attempt < 2 && (ins.status === 0 || ins.status >= 500 || uniqueOrConflict)
    if (!retryable) break
    await new Promise((r) => setTimeout(r, 650 * (attempt + 1)))
  }
  return null
}

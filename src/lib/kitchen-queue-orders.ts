import type { SupabaseClient } from '@supabase/supabase-js'
import { isKassaPosOrder } from '@/lib/admin-api-order-helpers'

export function parseOrdersItemsJson<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((order) => ({
    ...order,
    items:
      typeof order.items === 'string'
        ? JSON.parse(order.items as string)
        : ((order.items as unknown[]) ?? []),
  }))
}

/**
 * Keukenrij: webshop bevestigd/voorbereiding + open kassa-tafelmanden (DINE_IN) met inhoud.
 * DINE_IN die al op `preparing` staat maar nog niet betaald is, verdwijnt uit de rij (eten klaar gemeld).
 */
export function isKitchenQueueOrder(o: {
  status?: string
  order_type?: string
  items?: unknown
  payment_status?: string
  table_number?: string | number | null
}): boolean {
  const items = Array.isArray(o.items) ? o.items : []
  if (items.length === 0) return false
  const st = (o.status || '').toLowerCase()
  const ot = (o.order_type || '').toString().toUpperCase()
  const ps = (o.payment_status || '').toLowerCase()

  if (st === 'confirmed' || st === 'preparing') {
    // Na betalen aan tafel: nieuwe rij confirmed+paid mét tafelnummer — mand stond al op keuken; niet dubbel.
    // Ter plaatse zonder tafel (counter DINE_IN): wél tonen (geen open mand geweest).
    if (isKassaPosOrder(o) && ot === 'DINE_IN' && ps === 'paid') {
      const tn = o.table_number
      const hasTable = tn != null && String(tn).trim() !== ''
      if (hasTable) return false
    }
    if (isKassaPosOrder(o) && ot === 'DINE_IN' && ps !== 'paid' && st === 'preparing') {
      return false
    }
    return true
  }
  if (st === 'open' && ot === 'DINE_IN') return true
  return false
}

/** Combineert bevestigde webshop-/POS-betaalde rijen met open tafelmanden (één fetch-set, gesorteerd op tijd). */
export async function fetchKitchenQueueOrders(
  client: SupabaseClient,
  tenantSlug: string,
): Promise<Record<string, unknown>[]> {
  const [r1, r2] = await Promise.all([
    client
      .from('orders')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .in('status', ['confirmed', 'preparing'])
      .order('created_at', { ascending: true })
      .limit(50),
    client
      .from('orders')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .eq('status', 'open')
      .eq('order_type', 'DINE_IN')
      .order('created_at', { ascending: true })
      .limit(50),
  ])
  if (r1.error) console.warn('[kitchen-queue] fetch confirmed/preparing:', r1.error.message)
  if (r2.error) console.warn('[kitchen-queue] fetch open DINE_IN:', r2.error.message)

  const rows = [...(r1.data ?? []), ...(r2.data ?? [])]
  const byId = new Map<string, Record<string, unknown>>()
  for (const row of rows) {
    const id = row.id as string
    if (id && !byId.has(id)) byId.set(id, row as Record<string, unknown>)
  }
  const parsed = parseOrdersItemsJson([...byId.values()])
  return parsed
    .filter(isKitchenQueueOrder)
    .sort(
      (a, b) =>
        new Date(String(a.created_at ?? 0)).getTime() - new Date(String(b.created_at ?? 0)).getTime(),
    )
}

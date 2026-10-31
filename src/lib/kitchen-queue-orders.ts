import type { SupabaseClient } from '@supabase/supabase-js'
import { belgiumLocalToUtcIso, getBelgiumDateString } from '@/lib/belgium-date-bounds'
import { isKassaPosOrder } from '@/lib/admin-api-order-helpers'
import { isLagoonKitchenScreenTenant } from '@/lib/lagoon-kitchen-screen'

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
 * DINE_IN die al op `preparing`staat maar nog niet betaald is, verdwijnt uit de rij (eten klaar gemeld).
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

/** Oude onafgewerkte bonnen mogen nieuwe bonnen niet uit de rij duwen. */
const KITCHEN_QUEUE_LOOKBACK_MS = 18 * 60 * 60 * 1000
const KITCHEN_QUEUE_FETCH_LIMIT = 200
const LAGOON_TODAY_FETCH_LIMIT = 400

const LAGOON_TODAY_KITCHEN_STATUSES = ['open', 'confirmed', 'preparing', 'completed'] as const

export function kitchenQueueConfirmedSince(now: Date = new Date()): string {
  return new Date(now.getTime() - KITCHEN_QUEUE_LOOKBACK_MS).toISOString()
}

/** Bonnen van de Belgische kalenderdag, vanaf middernacht. */
export function kitchenQueueTodaySince(now: Date = new Date()): string {
  return belgiumLocalToUtcIso(getBelgiumDateString(now), '00:00')
}

/** The Lagoon: alle bonnen van vandaag op het scherm, niet alleen cocktail of koffie. */
export function isLagoonTodayKitchenOrder(order: { status?: string; items?: unknown }): boolean {
  const items = Array.isArray(order.items) ? order.items : []
  if (items.length === 0) return false
  const st = (order.status || '').toLowerCase()
  return (LAGOON_TODAY_KITCHEN_STATUSES as readonly string[]).includes(st)
}

/** Combineert bevestigde webshop-/POS-betaalde rijen met open tafelmanden (één fetch-set, gesorteerd op tijd). */
export async function fetchKitchenQueueOrders(
  client: SupabaseClient,
  tenantSlug: string,
): Promise<Record<string, unknown>[]> {
  if (isLagoonKitchenScreenTenant(tenantSlug)) {
    const todaySince = kitchenQueueTodaySince()
    const today = await client
      .from('orders')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .in('status', [...LAGOON_TODAY_KITCHEN_STATUSES])
      .gte('created_at', todaySince)
      .order('created_at', { ascending: false })
      .limit(LAGOON_TODAY_FETCH_LIMIT)
    if (today.error) console.warn('[kitchen-queue] fetch lagoon today:', today.error.message)
    return parseOrdersItemsJson((today.data ?? []) as Record<string, unknown>[])
      .filter(isLagoonTodayKitchenOrder)
      .sort(
        (a, b) =>
          new Date(String(a.created_at ?? 0)).getTime() - new Date(String(b.created_at ?? 0)).getTime(),
      )
  }

  const confirmedSince = kitchenQueueConfirmedSince()
  const [r1, r2] = await Promise.all([
    client
      .from('orders')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .in('status', ['confirmed', 'preparing'])
      .gte('created_at', confirmedSince)
      .order('created_at', { ascending: false })
      .limit(KITCHEN_QUEUE_FETCH_LIMIT),
    client
      .from('orders')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .eq('status', 'open')
      .eq('order_type', 'DINE_IN')
      .order('created_at', { ascending: false })
      .limit(KITCHEN_QUEUE_FETCH_LIMIT),
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

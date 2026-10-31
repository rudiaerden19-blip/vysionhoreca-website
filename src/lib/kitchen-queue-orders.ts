import type { SupabaseClient } from '@supabase/supabase-js'
import { isKassaPosOrder } from '@/lib/admin-api-order-helpers'
import {
  filterLagoonKitchenQueueOrder,
  isLagoonKitchenScreenTenant,
  loadLagoonKitchenCategoryContext,
} from '@/lib/lagoon-kitchen-screen'

export function parseOrdersItemsJson<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((order) => ({
    ...order,
    items:
      typeof order.items === 'string'
        ? (() => {
            try {
              return JSON.parse(order.items as string) as unknown[]
            } catch {
              console.warn('[kitchen-queue] invalid items JSON for order', order.id)
              return [] as unknown[]
            }
          })()
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

/** Gecachte Lagoon-categorieën — voorkomt lege keuken bij korte Supabase-hiccups. */
const lagoonKitchenCtxByTenant = new Map<
  string,
  import('@/lib/lagoon-kitchen-screen').LagoonKitchenCategoryContext
>()

export type KitchenQueueFetchResult = {
  orders: Record<string, unknown>[]
  /** Beide order-queries faalden — UI moet vorige rij houden, geen lege mand. */
  queryFailed: boolean
}

export function kitchenQueueConfirmedSince(now: Date = new Date()): string {
  return new Date(now.getTime() - KITCHEN_QUEUE_LOOKBACK_MS).toISOString()
}

/** Combineert bevestigde webshop-/POS-betaalde rijen met open tafelmanden (één fetch-set, gesorteerd op tijd). */
export async function fetchKitchenQueueOrders(
  client: SupabaseClient,
  tenantSlug: string,
): Promise<KitchenQueueFetchResult> {
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

  const queryFailed = Boolean(r1.error && r2.error)
  if (queryFailed) {
    return { orders: [], queryFailed: true }
  }

  const rows = [...(r1.data ?? []), ...(r2.data ?? [])]
  const byId = new Map<string, Record<string, unknown>>()
  for (const row of rows) {
    const id = row.id as string
    if (id && !byId.has(id)) byId.set(id, row as Record<string, unknown>)
  }
  const parsed = parseOrdersItemsJson([...byId.values()])

  let lagoonKitchenCtx = null as Awaited<ReturnType<typeof loadLagoonKitchenCategoryContext>> | null
  if (isLagoonKitchenScreenTenant(tenantSlug)) {
    lagoonKitchenCtx = lagoonKitchenCtxByTenant.get(tenantSlug) ?? null
    try {
      const loaded = await loadLagoonKitchenCategoryContext(client, tenantSlug)
      const hasMenuData =
        loaded.categoryNameById.size > 0 || loaded.productCategoryByProductId.size > 0
      if (hasMenuData) {
        lagoonKitchenCtxByTenant.set(tenantSlug, loaded)
        lagoonKitchenCtx = loaded
      }
    } catch (e) {
      console.warn('[kitchen-queue] lagoon category context failed:', e)
    }
  }

  const orders = parsed
    .filter(isKitchenQueueOrder)
    .map((order) => filterLagoonKitchenQueueOrder(tenantSlug, order, lagoonKitchenCtx))
    .filter((order): order is Record<string, unknown> => order != null)
    .sort(
      (a, b) =>
        new Date(String(a.created_at ?? 0)).getTime() - new Date(String(b.created_at ?? 0)).getTime(),
    )

  return { orders, queryFailed: false }
}

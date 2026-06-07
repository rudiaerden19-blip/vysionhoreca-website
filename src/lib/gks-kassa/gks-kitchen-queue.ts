import type { SupabaseClient } from '@supabase/supabase-js'
import { isGksZReportPilotTenant } from '@/lib/gks-kassa/pilot-config'
import { isKitchenQueueOrder, parseOrdersItemsJson } from '@/lib/kitchen-queue-orders'

function mapGksCommercialRowToKitchenOrder(row: Record<string, unknown>): Record<string, unknown> {
  const items = Array.isArray(row.items) ? row.items : []
  const tableNr = row.table_number
  const zone = row.floor_plan_zone
  const name =
    (row.customer_name as string) ||
    (tableNr != null ? `Tafel ${tableNr}` : 'GKS tafel')
  return {
    ...row,
    order_number: row.order_number ?? 0,
    customer_name: name,
    order_type: row.order_type ?? 'DINE_IN',
    status: row.status,
    payment_status: row.payment_status,
    total: Number(row.total) || 0,
    items,
    table_number: tableNr,
    floor_plan_zone: zone,
    _gks_commercial: true,
  }
}

/** Zelfde logica als `fetchKitchenQueueOrders` op `orders`, maar voor GKS-commercial (pilot). */
export async function fetchGksKitchenQueueRows(
  client: SupabaseClient,
  tenantSlug: string,
): Promise<Record<string, unknown>[]> {
  if (!isGksZReportPilotTenant(tenantSlug)) return []
  const [r1, r2] = await Promise.all([
    client
      .from('gks_commercial_orders')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .in('status', ['confirmed', 'preparing'])
      .order('created_at', { ascending: true })
      .limit(50),
    client
      .from('gks_commercial_orders')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .eq('status', 'open')
      .eq('order_type', 'DINE_IN')
      .order('created_at', { ascending: true })
      .limit(50),
  ])
  if (r1.error) console.warn('[gks-kitchen] confirmed/preparing:', r1.error.message)
  if (r2.error) console.warn('[gks-kitchen] open DINE_IN:', r2.error.message)

  const rows = [...(r1.data ?? []), ...(r2.data ?? [])]
  const byId = new Map<string, Record<string, unknown>>()
  for (const row of rows) {
    const id = row.id as string
    if (id && !byId.has(id)) byId.set(id, row as Record<string, unknown>)
  }
  const parsed = parseOrdersItemsJson([...byId.values()])
  return parsed.filter(isKitchenQueueOrder).map(mapGksCommercialRowToKitchenOrder)
}

export async function updateGksCommercialKitchenStatus(
  client: SupabaseClient,
  tenantSlug: string,
  orderId: string,
  status: 'preparing' | 'ready',
): Promise<boolean> {
  const { data, error } = await client
    .from('gks_commercial_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('tenant_slug', tenantSlug)
    .eq('id', orderId)
    .select('id')
  if (error) {
    console.warn('[gks-kitchen] status update:', error.message)
    return false
  }
  return (data?.length ?? 0) > 0
}

export function isGksCommercialKitchenOrder(order: { _gks_commercial?: boolean }): boolean {
  return order._gks_commercial === true
}

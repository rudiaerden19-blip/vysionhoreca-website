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

export async function fetchGksKitchenQueueRows(
  client: SupabaseClient,
  tenantSlug: string,
): Promise<Record<string, unknown>[]> {
  if (!isGksZReportPilotTenant(tenantSlug)) return []
  const [openRes, prepRes] = await Promise.all([
    client
      .from('gks_commercial_orders')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .eq('status', 'open')
      .eq('order_type', 'DINE_IN')
      .order('updated_at', { ascending: true })
      .limit(50),
    client
      .from('gks_commercial_orders')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .eq('status', 'preparing')
      .eq('order_type', 'DINE_IN')
      .order('updated_at', { ascending: true })
      .limit(50),
  ])
  if (openRes.error) console.warn('[gks-kitchen] open:', openRes.error.message)
  if (prepRes.error) console.warn('[gks-kitchen] preparing:', prepRes.error.message)
  const rows = [...(openRes.data ?? []), ...(prepRes.data ?? [])]
  const parsed = parseOrdersItemsJson(rows as Record<string, unknown>[])
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

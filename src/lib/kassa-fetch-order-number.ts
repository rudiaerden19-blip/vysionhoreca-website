import type { SupabaseClient } from '@supabase/supabase-js'

/** After insert edge cases or 23505 duplicate, resolve fiscal order_number for receipts/Z-sync. */
export async function fetchOrderNumberByKassaClientUuid(
  client: SupabaseClient,
  tenantSlug: string,
  kassaClientUuid: string
): Promise<number> {
  const { data, error } = await client
    .from('orders')
    .select('order_number')
    .eq('tenant_slug', tenantSlug)
    .eq('kassa_client_uuid', kassaClientUuid)
    .maybeSingle()

  if (error) {
    console.warn('[kassa] fetch order_number by kassa_client_uuid failed:', error.message)
    return 0
  }
  return data?.order_number != null ? Number(data.order_number) : 0
}

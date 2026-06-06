import { gksCommercialOrders } from '@/lib/gks-kassa/commercial-orders-client'

export async function fetchGksOrderNumberByKassaClientUuid(
  tenantSlug: string,
  kassaClientUuid: string,
): Promise<number> {
  const res = await gksCommercialOrders.fetchOrderNumberByKassaClientUuid(tenantSlug, kassaClientUuid)
  if (!res.ok) {
    console.warn('[gks-kassa] fetch order_number failed:', res.error)
    return 0
  }
  return res.data?.order_number != null ? Number(res.data.order_number) : 0
}

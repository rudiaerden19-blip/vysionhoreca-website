import { isLikelyOfflineOrNetworkPersistFailure } from '@/lib/kassa-supabase-guards'
import { gksCommercialOrders, isDuplicateGksKassaClientViolation } from '@/lib/gks-kassa/commercial-orders-client'
import { fetchGksOrderNumberByKassaClientUuid } from '@/lib/gks-kassa/gks-fetch-order-number'

export type GksPersistPaidCommercialResult = {
  orderNumber: number
  queuedOffline: boolean
  commercialOrderId?: string
  hardError?: string
}

/**
 * Na geslaagde signSale (N): commerciële mirror in gks_commercial_orders — niet productie orders.
 */
export async function gksPersistPaidCommercialOrder(
  tenantSlug: string,
  orderPayload: Record<string, unknown>,
  kassaClientUuid: string,
): Promise<GksPersistPaidCommercialResult> {
  const fallbackOrderNo = Number(orderPayload.order_number) || 0

  const insRes = await gksCommercialOrders.insert<{ order_number?: number; id?: string }>(
    tenantSlug,
    orderPayload,
    'order_number,id',
  )

  if (insRes.ok && insRes.data?.order_number != null) {
    return {
      orderNumber: Number(insRes.data.order_number),
      queuedOffline: false,
      commercialOrderId: insRes.data.id,
    }
  }

  if (insRes.ok && (insRes.data == null || insRes.data?.order_number == null)) {
    const n = await fetchGksOrderNumberByKassaClientUuid(tenantSlug, kassaClientUuid)
    if (n > 0) {
      return { orderNumber: n, queuedOffline: false, commercialOrderId: insRes.data?.id }
    }
    return {
      orderNumber: fallbackOrderNo,
      queuedOffline: false,
      hardError: insRes.data == null ? 'insert_empty_response' : 'order_number_unresolved',
      commercialOrderId: insRes.data?.id,
    }
  }

  if (!insRes.ok && isDuplicateGksKassaClientViolation(insRes.error)) {
    const n = await fetchGksOrderNumberByKassaClientUuid(tenantSlug, kassaClientUuid)
    return {
      orderNumber: n > 0 ? n : fallbackOrderNo,
      queuedOffline: false,
    }
  }

  if (
    !insRes.ok &&
    (insRes.status === 0 || insRes.status >= 500 || isLikelyOfflineOrNetworkPersistFailure(insRes.error))
  ) {
    return {
      orderNumber: fallbackOrderNo,
      queuedOffline: false,
      hardError: 'gks_no_offline_fiscal_persist',
    }
  }

  const errMsg = !insRes.ok ? insRes.error || 'insert_failed' : 'insert_failed'
  return {
    orderNumber: fallbackOrderNo,
    queuedOffline: false,
    hardError: errMsg,
  }
}

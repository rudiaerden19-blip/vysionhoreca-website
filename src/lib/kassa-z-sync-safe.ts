import { syncZReportAfterOrder } from '@/lib/admin-api'

/**
 * Z-rapport refresh na order — fire-and-forget met `.catch`.
 * Voorkomt unhandled promise rejections als autoUpdateZReport faalt (netwerk/RLS),
 * zonder de betalingsflow te blokkeren.
 */
export function syncZReportAfterOrderSafe(tenantSlug: string, orderCreatedAt: string): void {
  void syncZReportAfterOrder(tenantSlug, orderCreatedAt).catch((err: unknown) => {
    console.warn('[kassa] syncZReportAfterOrder failed', tenantSlug, err)
  })
}

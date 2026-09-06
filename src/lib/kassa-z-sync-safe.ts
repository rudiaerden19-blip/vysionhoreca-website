import { authFetch } from '@/lib/auth-headers'
import { getBelgiumDateString } from '@/lib/belgium-date-bounds'
import { getOpeningHours } from '@/lib/admin-api-shop-hours'
import { businessDayForOrder } from '@/lib/tenant-business-day'

/**
 * Z-rapport refresh na order — fire-and-forget naar de server.
 *
 * Sinds Phase 1 RLS-lockdown kan de browser niet meer rechtstreeks naar
 * z_reports schrijven. Daarom roepen we /api/kassa/sync-z-report aan dat
 * server-side met service-role het rapport opnieuw berekent.
 */
export function syncZReportAfterOrderSafe(tenantSlug: string, orderCreatedAt: string): void {
  void (async () => {
    try {
      const hours = await getOpeningHours(tenantSlug)
      const date =
        businessDayForOrder(orderCreatedAt, hours) ?? getBelgiumDateString(new Date(orderCreatedAt))
      const res = await authFetch('/api/kassa/sync-z-report', {
        method: 'POST',
        body: JSON.stringify({ tenantSlug, date }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        console.warn('[kassa] syncZReport failed:', res.status, json?.error)
      }
    } catch (err) {
      console.warn('[kassa] syncZReport error:', err)
    }
  })()
}

import { authFetch } from '@/lib/auth-headers'
import { getBelgiumDateString } from '@/lib/admin-api'

/**
 * Z-rapport refresh na order — fire-and-forget naar de server.
 *
 * Sinds Phase 1 RLS-lockdown kan de browser niet meer rechtstreeks naar
 * z_reports schrijven. Daarom roepen we /api/kassa/sync-z-report aan dat
 * server-side met service-role het rapport opnieuw berekent.
 */
export function syncZReportAfterOrderSafe(tenantSlug: string, orderCreatedAt: string): void {
  try {
    const date = getBelgiumDateString(new Date(orderCreatedAt))
    void authFetch('/api/kassa/sync-z-report', {
      method: 'POST',
      body: JSON.stringify({ tenantSlug, date }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          console.warn('[kassa] syncZReport failed:', res.status, json?.error)
        }
      })
      .catch((err) => {
        console.warn('[kassa] syncZReport network error:', err)
      })
  } catch (err) {
    console.warn('[kassa] syncZReport setup error:', err)
  }
}

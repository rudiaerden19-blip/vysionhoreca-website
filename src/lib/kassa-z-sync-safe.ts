import { authFetch } from '@/lib/auth-headers'
import { adminDb } from '@/lib/admin-db-client'
import { addDaysToBelgiumYMD, getBelgiumDateString } from '@/lib/belgium-date-bounds'
import { getOpeningHours } from '@/lib/admin-api-shop-hours'
import { businessDayForOrder, orderReportDateForShift } from '@/lib/tenant-business-day'

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
      const clock =
        businessDayForOrder(orderCreatedAt, hours) ?? getBelgiumDateString(new Date(orderCreatedAt))
      const prevDate = addDaysToBelgiumYMD(clock, -1)
      const prev = await adminDb.select<{ is_closed?: boolean | null; closed_at?: string | null }>('z_reports', {
        tenantSlug,
        select: 'is_closed, closed_at',
        match: { report_date: prevDate },
        single: 'maybe',
      })
      const shifts =
        prev.ok && prev.data
          ? [{
              reportDate: prevDate,
              closedAt: prev.data.is_closed ? prev.data.closed_at ?? null : null,
            }]
          : []
      const date = orderReportDateForShift(orderCreatedAt, hours, shifts) ?? clock
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

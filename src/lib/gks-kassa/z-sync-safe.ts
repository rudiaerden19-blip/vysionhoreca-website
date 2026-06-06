/**
 * GKS-kassa: geen productie z_reports. Z alleen pilot via signReportTurnoverZ (async fire-and-forget).
 */
import { isGksZReportPilotTenant } from '@/lib/gks-kassa/pilot-config'
import { signReportTurnoverZ, type GksPartnerContext } from '@/services/gksPartnerService'

export function syncZReportAfterOrderSafe(tenantSlug: string, _orderCreatedAt: string): void {
  if (!isGksZReportPilotTenant(tenantSlug)) return
  void signReportTurnoverZ(
    { tenantSlug, employeeId: '00000000029', vatNo: 'BE0000000000' } as GksPartnerContext,
    { reportNo: 1, reportBookingDate: _orderCreatedAt.slice(0, 10), turnover: { transactions: [] } },
  ).catch((e) => console.warn('[gks-kassa] Z pilot', e))
}

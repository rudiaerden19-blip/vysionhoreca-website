/**
 * GKS-kassa: geen productie z_reports. Z alleen pilot via signReportTurnoverZ (async fire-and-forget).
 */
import { assertGksCanFiscalize, partnerCtxFromAvailability } from '@/lib/gks-kassa/gks-availability'
import { isGksZReportPilotTenant } from '@/lib/gks-kassa/pilot-config'
import { signReportTurnoverZ } from '@/services/gksPartnerService'

export function syncZReportAfterOrderSafe(
  tenantSlug: string,
  _orderCreatedAt: string,
  opts?: { staffInsz?: string | null; vatNo?: string },
): void {
  if (!isGksZReportPilotTenant(tenantSlug)) return
  void (async () => {
    const staff =
      opts?.staffInsz?.trim()
        ? { id: 'z-sync', name: 'Z-sync', insz: opts.staffInsz.trim() }
        : null
    const gate = await assertGksCanFiscalize({
      tenantSlug,
      staff,
      vatNo: opts?.vatNo?.trim() || 'BE0000000000',
    })
    if (gate) {
      console.warn('[gks-kassa] Z pilot geblokkeerd:', gate.message)
      return
    }
    const ctx = partnerCtxFromAvailability({
      tenantSlug,
      staff,
      vatNo: opts?.vatNo?.trim() || 'BE0000000000',
    })
    await signReportTurnoverZ(ctx, {
      reportNo: 1,
      reportBookingDate: _orderCreatedAt.slice(0, 10),
      turnover: { transactions: [] },
    })
  })().catch((e) => console.warn('[gks-kassa] Z pilot', e))
}

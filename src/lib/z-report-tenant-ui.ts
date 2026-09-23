/** Per-tenant Z-rapport UI (alleen expliciete uitzonderingen). */

export const Z_REPORT_TONTBIJTHUISJE_SLUG = 'tontbijthuisje' as const

const HIDE_DAY_RECEIPTS_PANEL = new Set<string>([Z_REPORT_TONTBIJTHUISJE_SLUG])

/** «Bonnen vandaag» / wijzig betaling — uit voor t ontbijthuisje. */
export function zReportShowDayReceiptsPanel(tenantSlug: string): boolean {
  return !HIDE_DAY_RECEIPTS_PANEL.has(tenantSlug)
}

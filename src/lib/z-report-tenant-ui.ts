/** Per-tenant Z-rapport UI (alleen expliciete uitzonderingen). */

export const Z_REPORT_TONTBIJTHUISJE_SLUG = 'tontbijthuisje' as const

const HIDE_DAY_RECEIPTS_PANEL = new Set<string>([Z_REPORT_TONTBIJTHUISJE_SLUG])

/** Eerste zichtbare boekdag. Dagen ervoor bestonden de zaak nog niet. */
const BOOKS_VISIBLE_FROM: Record<string, string> = {
  [Z_REPORT_TONTBIJTHUISJE_SLUG]: '2026-09-15',
}

export function tenantBooksVisibleFrom(tenantSlug: string): string | null {
  return BOOKS_VISIBLE_FROM[tenantSlug] ?? null
}

export function tenantBookDateVisible(tenantSlug: string, ymd: string): boolean {
  const from = tenantBooksVisibleFrom(tenantSlug)
  if (!from) return true
  return ymd.slice(0, 10) >= from
}

/** «Bonnen vandaag» / wijzig betaling — uit voor t ontbijthuisje. */
export function zReportShowDayReceiptsPanel(tenantSlug: string): boolean {
  return !HIDE_DAY_RECEIPTS_PANEL.has(tenantSlug)
}

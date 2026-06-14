import { normalizeTenantSlugKey } from '@/lib/demo-links'

/**
 * Eigenaar-exceptie: alleen Lomi Chillplay — sidebar/mand-weergave.
 * Geen wijziging aan parkeren, betalen of tafel-sync (flow blijft identiek aan andere tenants).
 */
const LOMI_CHILLPLAY_SLUG_KEYS = new Set(['lomichillplay'])

function lomiChillplaySlugKey(tenantSlug: string): string {
  return normalizeTenantSlugKey(tenantSlug).replace(/_/g, '')
}

export function isLomiChillplayKassaTenant(tenantSlug: string): boolean {
  return LOMI_CHILLPLAY_SLUG_KEYS.has(lomiChillplaySlugKey(tenantSlug))
}

/** Zichtbaarheid hoofdpaneel mand (donker/licht) — default: alleen nieuwe karregels. */
export function kassaSidebarShowsOrderPanel(
  tenantSlug: string,
  cartLength: number,
  billLinesLength: number,
): boolean {
  if (isLomiChillplayKassaTenant(tenantSlug)) {
    return billLinesLength > 0 || cartLength > 0
  }
  return cartLength > 0
}

/** Bovenste tafelblok (legacy layout) — Lomi gebruikt alles in het hoofdpaneel. */
export function kassaSidebarShowsLegacyParkedHeaderBlock(
  tenantSlug: string,
  showParked: boolean,
  parkedOnlySidebarView: boolean,
  numpadPanelVisible: boolean,
): boolean {
  if (isLomiChillplayKassaTenant(tenantSlug)) return false
  if (!showParked) return false
  return parkedOnlySidebarView || numpadPanelVisible
}

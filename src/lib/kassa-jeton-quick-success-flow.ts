import type { TenantSettings } from '@/lib/admin-api'

/** Lagoon-pilot: succesmodal kort tonen, daarna weg. */
export const KASSA_JETON_QUICK_SUCCESS_MODAL_MS = 1000

const LAGOON_JETON_QUICK_SLUG = 'thelagoon'

function normalizeKassaJetonTenantSlug(tenantSlug: string): string {
  return String(tenantSlug ?? '').trim().toLowerCase()
}

/**
 * Snelle jeton-OK + auto-sluit succesmodal.
 * Lagoon: altijd (pilot). Overige tenants: alleen superadmin-flag (default uit).
 */
export function isKassaJetonQuickSuccessFlowTenant(
  tenantSlug: string,
  settings?: TenantSettings | null,
): boolean {
  const slug = normalizeKassaJetonTenantSlug(tenantSlug)
  if (slug === LAGOON_JETON_QUICK_SLUG) return true
  return settings?.kassa_jeton_quick_success_flow === true
}

/**
 * The Lagoon iPad: scroll + vaste footer — geen kleinere knoppen/tekst, wel groene betaalknop zichtbaar.
 */
export function isKassaJetonLagoonCompactModalTenant(tenantSlug: string): boolean {
  return normalizeKassaJetonTenantSlug(tenantSlug) === LAGOON_JETON_QUICK_SLUG
}

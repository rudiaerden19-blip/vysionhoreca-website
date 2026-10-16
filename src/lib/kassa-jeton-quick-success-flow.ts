import type { TenantSettings } from '@/lib/admin-api'

/** Lagoon-pilot: succesmodal kort tonen, daarna weg. */
export const KASSA_JETON_QUICK_SUCCESS_MODAL_MS = 1000

const LAGOON_JETON_QUICK_SLUG = 'thelagoon'

/**
 * Snelle jeton-OK + auto-sluit succesmodal.
 * Lagoon: altijd (pilot). Overige tenants: alleen superadmin-flag (default uit).
 */
export function isKassaJetonQuickSuccessFlowTenant(
  tenantSlug: string,
  settings?: TenantSettings | null,
): boolean {
  const slug = String(tenantSlug ?? '').trim().toLowerCase()
  if (slug === LAGOON_JETON_QUICK_SLUG) return true
  return settings?.kassa_jeton_quick_success_flow === true
}

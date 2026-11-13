import { isTheLagoonTenant } from '@/lib/lagoon-kitchen-screen'
import { normalizeCategoryVatPercent, type CategoryVatPercent } from '@/lib/order-vat'

/** The Lagoon: vast 21% op kassa, bonnen en Z-rapporten (geen BE 6/12-split). */
export const THE_LAGOON_UNIFORM_VAT_PERCENT = 21 as const satisfies CategoryVatPercent

export function lagoonForcesUniformVat21(tenantSlug: string): boolean {
  return isTheLagoonTenant(tenantSlug)
}

export function resolveTenantBtwPercentage(
  tenantSlug: string,
  raw: unknown,
  fallbackWhenMissing: number,
): CategoryVatPercent {
  if (lagoonForcesUniformVat21(tenantSlug)) return THE_LAGOON_UNIFORM_VAT_PERCENT
  return normalizeCategoryVatPercent(raw, fallbackWhenMissing)
}

export function lagoonUniformVatIfApplicable(
  tenantSlug: string | null | undefined,
  ctx?: { forceUniformVat21?: boolean } | null,
): CategoryVatPercent | null {
  if (ctx?.forceUniformVat21) return THE_LAGOON_UNIFORM_VAT_PERCENT
  if (tenantSlug && lagoonForcesUniformVat21(tenantSlug)) return THE_LAGOON_UNIFORM_VAT_PERCENT
  return null
}

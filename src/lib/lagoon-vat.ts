import { isTheLagoonTenant, normalizeLagoonTenantSlug } from '@/lib/lagoon-kitchen-screen'
import { normalizeCategoryVatPercent, type CategoryVatPercent } from '@/lib/order-vat'

/** The Lagoon: vast 21% op kassa, bonnen en Z-rapporten (geen BE 6/12-split). */
export const THE_LAGOON_UNIFORM_VAT_PERCENT = 21 as const satisfies CategoryVatPercent

const LAGOON_CANONICAL_SLUGS = new Set<string>(['thelagoon', 'the-lagoon'])

/** Enige toegestane slug-check voor uniform 21% — niet vervangen door globale BTW-wijzigingen. */
export function lagoonForcesUniformVat21(tenantSlug: string): boolean {
  const normalized = normalizeLagoonTenantSlug(tenantSlug) || tenantSlug.trim().toLowerCase()
  if (LAGOON_CANONICAL_SLUGS.has(normalized)) return true
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

/** tenant_settings uit DB: UI en cache tonen nooit een ander zaak-tarief voor Lagoon. */
export function normalizeLagoonTenantSettingsForRead<T extends { btw_percentage?: number | null }>(
  tenantSlug: string,
  row: T,
): T {
  if (!lagoonForcesUniformVat21(tenantSlug)) return row
  if (row.btw_percentage === THE_LAGOON_UNIFORM_VAT_PERCENT) return row
  return { ...row, btw_percentage: THE_LAGOON_UNIFORM_VAT_PERCENT }
}

/** Elke upsert naar tenant_settings voor Lagoon dwingt 21% (ook partiële saves). */
export function lagoonTenantSettingsBeforeUpsert<T extends { tenant_slug: string }>(settings: T): T {
  if (!lagoonForcesUniformVat21(settings.tenant_slug)) return settings
  return { ...settings, btw_percentage: THE_LAGOON_UNIFORM_VAT_PERCENT } as T
}

/** menu_categories.default_btw_percentage voor Lagoon altijd 21 (voorkomt terugval via categorie-UI). */
export function lagoonMenuCategoryDefaultBtwOnSave(
  tenantSlug: string,
  defaultBtw: number | null | undefined,
): number | null | undefined {
  if (!lagoonForcesUniformVat21(tenantSlug)) return defaultBtw
  return THE_LAGOON_UNIFORM_VAT_PERCENT
}

export function lagoonUniformVatIfApplicable(
  tenantSlug: string | null | undefined,
  ctx?: { forceUniformVat21?: boolean } | null,
): CategoryVatPercent | null {
  if (ctx?.forceUniformVat21) return THE_LAGOON_UNIFORM_VAT_PERCENT
  if (tenantSlug && lagoonForcesUniformVat21(tenantSlug)) return THE_LAGOON_UNIFORM_VAT_PERCENT
  return null
}

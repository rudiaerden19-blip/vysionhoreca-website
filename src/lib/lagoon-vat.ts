import { isTheLagoonTenant, normalizeLagoonTenantSlug } from '@/lib/lagoon-kitchen-screen'
import {
  aggregateZReportVatFromOrderRows,
  normalizeCategoryVatPercent,
  type CategoryVatPercent,
  type ZReportVatAggregate,
  type ZReportVatOrderSlice,
} from '@/lib/order-vat'
import type { ZReportVatContext } from '@/lib/z-report-vat-context'

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

type LagoonTenantSettingsShape = {
  btw_percentage?: number | null
  kassa_checkout_vat_mode?: string | null
}

/** tenant_settings uit DB: UI en cache tonen nooit een ander zaak-tarief voor Lagoon. */
export function normalizeLagoonTenantSettingsForRead<T extends LagoonTenantSettingsShape>(
  tenantSlug: string,
  row: T,
): T {
  if (!lagoonForcesUniformVat21(tenantSlug)) return row
  const next: LagoonTenantSettingsShape = { ...row }
  let changed = false
  if (row.btw_percentage !== THE_LAGOON_UNIFORM_VAT_PERCENT) {
    next.btw_percentage = THE_LAGOON_UNIFORM_VAT_PERCENT
    changed = true
  }
  if (row.kassa_checkout_vat_mode && row.kassa_checkout_vat_mode !== 'off') {
    next.kassa_checkout_vat_mode = 'off'
    changed = true
  }
  if (!changed) return row
  return { ...row, ...next } as T
}

/** Elke upsert naar tenant_settings voor Lagoon dwingt 21% (ook partiële saves). */
export function lagoonTenantSettingsBeforeUpsert<T extends { tenant_slug: string }>(settings: T): T {
  if (!lagoonForcesUniformVat21(settings.tenant_slug)) return settings
  return {
    ...settings,
    btw_percentage: THE_LAGOON_UNIFORM_VAT_PERCENT,
    kassa_checkout_vat_mode: 'off',
  } as T
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

/** Rapporten/Z: context kan niet per ongeluk zonder Lagoon-vlag binnenkomen. */
export function sealZReportVatContextForTenant(
  tenantSlug: string,
  ctx?: ZReportVatContext | null,
): ZReportVatContext {
  const base: ZReportVatContext = ctx ?? {
    categoryById: new Map(),
    productCategoryById: new Map(),
    productCategoryByNormalizedName: new Map(),
  }
  if (!lagoonForcesUniformVat21(tenantSlug)) return base
  return { ...base, forceUniformVat21: true }
}

/** Enige aggregatie-pad voor Z/rapporten — tenantDefault + ctx automatisch afgedicht. */
export function aggregateZReportVatForTenant(
  tenantSlug: string,
  orders: ZReportVatOrderSlice[],
  rawSettingsBtw: unknown,
  ctx?: ZReportVatContext | null,
): ZReportVatAggregate {
  const tenantDefault = resolveTenantBtwPercentage(tenantSlug, rawSettingsBtw, 6)
  const safeCtx = sealZReportVatContextForTenant(tenantSlug, ctx)
  return aggregateZReportVatFromOrderRows(orders, tenantDefault, safeCtx)
}

/** Opgeslagen Z-rapporten vóór uniform 21%: toon alles onder 21%-kolom. */
export function normalizeLagoonStoredZReportVat<
  T extends { tax_low?: number | null; tax_mid?: number | null; tax_high?: number | null },
>(tenantSlug: string, row: T): T {
  if (!lagoonForcesUniformVat21(tenantSlug)) return row
  const low = Number(row.tax_low) || 0
  const mid = Number(row.tax_mid) || 0
  const high = Number(row.tax_high) || 0
  const totalTax = Math.round((low + mid + high) * 100) / 100
  if (low === 0 && mid === 0 && high === totalTax) return row
  return { ...row, tax_low: 0, tax_mid: 0, tax_high: totalTax }
}

export function normalizeLagoonMenuCategoriesForRead<
  T extends { default_btw_percentage?: number | null },
>(tenantSlug: string, categories: T[]): T[] {
  if (!lagoonForcesUniformVat21(tenantSlug)) return categories
  return categories.map((c) =>
    c.default_btw_percentage === THE_LAGOON_UNIFORM_VAT_PERCENT
      ? c
      : { ...c, default_btw_percentage: THE_LAGOON_UNIFORM_VAT_PERCENT },
  )
}

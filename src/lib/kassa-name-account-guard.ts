import type { KassaPaymentMethod } from '@/lib/kassa-cart-types'
import type { KassaNameTabRow } from '@/lib/kassa-name-account'

/** Max. eenmalige betaling op tab (misbruik / typo). */
export const NAME_ACCOUNT_MAX_PAYMENT_EUR = 99_999.99

const ALLOWED_PAY_METHODS = new Set<KassaPaymentMethod>(['CASH', 'CARD', 'IDEAL', 'BANCONTACT', 'SPLIT'])

export type NameTabPaymentGuardError =
  | 'invalid_tenant'
  | 'tenant_scope_violation'
  | 'tab_not_in_tenant'
  | 'invalid_tab_id'
  | 'invalid_amount'
  | 'invalid_payment_method'

export function normalizeNameAccountTenantSlug(raw: string): string | null {
  const slug = String(raw ?? '').trim()
  if (!slug || slug.length > 128) return null
  return slug
}

/** Alleen rijen van de actieve zaak (cache/DB defense-in-depth). */
export function filterKassaNameTabsForTenant(
  rows: readonly KassaNameTabRow[],
  tenantSlug: string,
): KassaNameTabRow[] {
  const tenant = normalizeNameAccountTenantSlug(tenantSlug)
  if (!tenant) return []
  return rows.filter((r) => String(r.tenant_slug ?? '').trim() === tenant)
}

export function assertNameTabBelongsToTenant(
  tab: KassaNameTabRow,
  tenantSlug: string,
): { ok: true } | { ok: false; error: NameTabPaymentGuardError } {
  const tenant = normalizeNameAccountTenantSlug(tenantSlug)
  if (!tenant) return { ok: false, error: 'invalid_tenant' }
  const tabTenant = String(tab.tenant_slug ?? '').trim()
  if (!tabTenant || tabTenant !== tenant) {
    return { ok: false, error: 'tenant_scope_violation' }
  }
  const id = String(tab.id ?? '').trim()
  if (!id) return { ok: false, error: 'invalid_tab_id' }
  return { ok: true }
}

export function assertNameTabKnownForTenant(
  tab: KassaNameTabRow,
  knownTabs: readonly KassaNameTabRow[],
  tenantSlug: string,
): { ok: true } | { ok: false; error: NameTabPaymentGuardError } {
  const scope = assertNameTabBelongsToTenant(tab, tenantSlug)
  if (!scope.ok) return scope
  const id = String(tab.id).trim()
  const hit = filterKassaNameTabsForTenant(knownTabs, tenantSlug).some((r) => r.id === id)
  if (!hit) return { ok: false, error: 'tab_not_in_tenant' }
  return { ok: true }
}

export function sanitizeNameTabPaymentAmountEur(raw: number): number | null {
  if (!Number.isFinite(raw) || raw <= 0) return null
  const cents = Math.round(raw * 100)
  if (cents <= 0) return null
  const eur = cents / 100
  if (eur > NAME_ACCOUNT_MAX_PAYMENT_EUR) return null
  return eur
}

export function assertAllowedNameAccountPaymentMethod(
  method: KassaPaymentMethod,
): { ok: true } | { ok: false; error: NameTabPaymentGuardError } {
  if (!ALLOWED_PAY_METHODS.has(method)) {
    return { ok: false, error: 'invalid_payment_method' }
  }
  return { ok: true }
}

/** Centrale check vóór registerKassaNameTabPayment / UI. */
export function validateNameTabPaymentRequest(params: {
  tenantSlug: string
  tab: KassaNameTabRow
  amountEur: number
  paymentMethod: KassaPaymentMethod
  knownTabs?: readonly KassaNameTabRow[]
}): { ok: true; amountEur: number } | { ok: false; error: NameTabPaymentGuardError } {
  const scope = assertNameTabBelongsToTenant(params.tab, params.tenantSlug)
  if (!scope.ok) return scope

  if (params.knownTabs) {
    const known = assertNameTabKnownForTenant(params.tab, params.knownTabs, params.tenantSlug)
    if (!known.ok) return known
  }

  const methodOk = assertAllowedNameAccountPaymentMethod(params.paymentMethod)
  if (!methodOk.ok) return methodOk

  const amountEur = sanitizeNameTabPaymentAmountEur(params.amountEur)
  if (amountEur == null) return { ok: false, error: 'invalid_amount' }

  return { ok: true, amountEur }
}

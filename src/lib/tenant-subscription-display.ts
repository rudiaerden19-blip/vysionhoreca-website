import { isAdminTenant } from '@/lib/protected-tenants'
import {
  MONTHLY_PRICE_WITHOUT_HARDWARE,
  MONTHLY_PRICE_WITH_HARDWARE,
} from '@/lib/pricing-hardware'
import { formatLicenseInvoiceAmounts } from '@/lib/tenant-license-invoice'

export type TenantPlanTier = 'pro' | 'starter'

export function normalizeSubscriptionPlan(plan: string | null | undefined): TenantPlanTier {
  const raw = (plan ?? '').trim().toLowerCase()
  if (raw === 'pro' || raw === 'premium' || raw === 'plus') return 'pro'
  return 'starter'
}

export function isPremiumPlan(plan: string | null | undefined): boolean {
  return normalizeSubscriptionPlan(plan) === 'pro'
}

/**
 * Effectief plan voor UI (abonnement-pagina): subscription + tenants + trial.
 */
export type LicenseInvoicePlanHint = {
  status?: string | null
  amount?: number | null
  amount_excl_vat?: number | null
  description?: string | null
}

export function tenantHasPaidPremiumLicense(
  invoices: LicenseInvoicePlanHint[] | null | undefined,
): boolean {
  if (!invoices?.length) return false
  return invoices.some((inv) => {
    if ((inv.status || '').toLowerCase() !== 'paid') return false
    const { excl } = formatLicenseInvoiceAmounts({
      amount: Number(inv.amount) || 0,
      amount_excl_vat: inv.amount_excl_vat,
    })
    if (excl >= MONTHLY_PRICE_WITH_HARDWARE) return true
    const desc = (inv.description || '').toLowerCase()
    return desc.includes('premium') || desc.includes('pro licentie') || desc.includes('vysion licentie')
  })
}

export function resolveTenantCurrentPlan(input: {
  tenantSlug: string
  subscription: {
    plan?: string | null
    status?: string | null
    price_monthly?: number | null
  } | null
  tenant: { plan?: string | null; subscription_status?: string | null } | null
  licenseInvoices?: LicenseInvoicePlanHint[] | null
}): TenantPlanTier {
  if (isAdminTenant(input.tenantSlug)) return 'pro'

  const status = (
    input.subscription?.status ||
    input.tenant?.subscription_status ||
    'trial'
  )
    .toString()
    .trim()
    .toLowerCase()

  const subPlan = normalizeSubscriptionPlan(input.subscription?.plan)
  const tenantPlan = normalizeSubscriptionPlan(input.tenant?.plan)

  if (status === 'trial') return 'pro'

  if (input.subscription) {
    if (status === 'active' || status === 'past_due') {
      if (subPlan === 'pro') return 'pro'
      const monthly = Number(input.subscription.price_monthly)
      if (Number.isFinite(monthly) && monthly >= 99) return 'pro'
    }
  }

  if (subPlan === 'pro') return 'pro'
  if (tenantPlan === 'pro') return 'pro'

  if (tenantHasPaidPremiumLicense(input.licenseInvoices)) return 'pro'

  const monthly = Number(input.subscription?.price_monthly)
  if (
    (status === 'active' || status === 'past_due') &&
    Number.isFinite(monthly) &&
    monthly >= MONTHLY_PRICE_WITH_HARDWARE
  ) {
    return 'pro'
  }

  return tenantPlan
}

/** Legacy 59 → 69; pro in DB met te lage price_monthly → 99 (superadmin + tenant UI). */
export function subscriptionMonthlyEurosFromPlan(
  plan: string | null | undefined,
  priceMonthly?: number | null,
): number {
  const premium = isPremiumPlan(plan)
  const listPrice = premium ? MONTHLY_PRICE_WITH_HARDWARE : MONTHLY_PRICE_WITHOUT_HARDWARE
  const stored = Number(priceMonthly)
  if (!Number.isFinite(stored) || stored <= 0) return listPrice
  if (premium && stored < MONTHLY_PRICE_WITH_HARDWARE) return MONTHLY_PRICE_WITH_HARDWARE
  if (!premium && stored === 59) return MONTHLY_PRICE_WITHOUT_HARDWARE
  return stored
}

export function tenantPlanMonthlyEuros(
  plan: TenantPlanTier,
  subscription: { price_monthly?: number | null; plan?: string | null } | null,
): number {
  return subscriptionMonthlyEurosFromPlan(plan, subscription?.price_monthly)
}

export { MONTHLY_PRICE_WITHOUT_HARDWARE, MONTHLY_PRICE_WITH_HARDWARE }

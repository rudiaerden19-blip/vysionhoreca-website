import { isAdminTenant } from '@/lib/protected-tenants'
import {
  MONTHLY_PRICE_WITHOUT_HARDWARE,
  MONTHLY_PRICE_WITH_HARDWARE,
} from '@/lib/pricing-hardware'

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
export function resolveTenantCurrentPlan(input: {
  tenantSlug: string
  subscription: {
    plan?: string | null
    status?: string | null
    price_monthly?: number | null
  } | null
  tenant: { plan?: string | null; subscription_status?: string | null } | null
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

export function tenantPlanMonthlyEuros(
  plan: TenantPlanTier,
  subscription: { price_monthly?: number | null } | null,
): number {
  const stored = Number(subscription?.price_monthly)
  if (Number.isFinite(stored) && stored > 0) return stored
  return isPremiumPlan(plan) ? MONTHLY_PRICE_WITH_HARDWARE : MONTHLY_PRICE_WITHOUT_HARDWARE
}

export { MONTHLY_PRICE_WITHOUT_HARDWARE, MONTHLY_PRICE_WITH_HARDWARE }

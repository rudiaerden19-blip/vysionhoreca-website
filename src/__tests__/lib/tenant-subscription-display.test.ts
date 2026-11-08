import {
  isPremiumPlan,
  normalizeSubscriptionPlan,
  resolveTenantCurrentPlan,
  tenantPlanMonthlyEuros,
} from '@/lib/tenant-subscription-display'

describe('tenant-subscription-display', () => {
  it('normaliseert premium naar pro', () => {
    expect(normalizeSubscriptionPlan('premium')).toBe('pro')
    expect(normalizeSubscriptionPlan('PRO')).toBe('pro')
    expect(isPremiumPlan('premium')).toBe(true)
  })

  it('active pro subscription ook als tenant.plan starter blijft', () => {
    expect(
      resolveTenantCurrentPlan({
        tenantSlug: 'lomichillplay',
        subscription: { plan: 'pro', status: 'active', price_monthly: 99 },
        tenant: { plan: 'starter', subscription_status: 'active' },
      }),
    ).toBe('pro')
  })

  it('premium toont 99 p/m standaard', () => {
    expect(
      tenantPlanMonthlyEuros('pro', { price_monthly: null }),
    ).toBe(99)
    expect(tenantPlanMonthlyEuros('starter', null)).toBe(69)
  })

  it('starter blijft starter', () => {
    expect(
      resolveTenantCurrentPlan({
        tenantSlug: 'demo-zaak',
        subscription: { plan: 'starter', status: 'active', price_monthly: 59 },
        tenant: { plan: 'starter', subscription_status: 'active' },
      }),
    ).toBe('starter')
  })
})

import {
  isPremiumPlan,
  normalizeSubscriptionPlan,
  resolveTenantCurrentPlan,
  subscriptionMonthlyEurosFromPlan,
  tenantHasPaidPremiumLicense,
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

  it('legacy 59 en pro met 59 worden 69/99', () => {
    expect(subscriptionMonthlyEurosFromPlan('starter', 59)).toBe(69)
    expect(subscriptionMonthlyEurosFromPlan('pro', 59)).toBe(99)
  })

  it('premium toont 99 p/m standaard', () => {
    expect(
      tenantPlanMonthlyEuros('pro', { price_monthly: null }),
    ).toBe(99)
    expect(tenantPlanMonthlyEuros('starter', null)).toBe(69)
  })

  it('active met price 99 telt als premium ook bij plan starter', () => {
    expect(
      resolveTenantCurrentPlan({
        tenantSlug: 'klant-x',
        subscription: { plan: 'starter', status: 'active', price_monthly: 99 },
        tenant: { plan: 'starter', subscription_status: 'active' },
      }),
    ).toBe('pro')
  })

  it('betaalde premium-licentiefactuur telt als pro', () => {
    expect(
      resolveTenantCurrentPlan({
        tenantSlug: 'donerkebablaakdal',
        subscription: { plan: 'starter', status: 'active', price_monthly: 59 },
        tenant: { plan: 'starter', subscription_status: 'active' },
        licenseInvoices: [
          {
            status: 'paid',
            amount: 119.79,
            amount_excl_vat: 99,
            description: 'Vysion licentie — Premium',
          },
        ],
      }),
    ).toBe('pro')
    expect(tenantHasPaidPremiumLicense([{ status: 'paid', amount_excl_vat: 99, amount: 119.79 }])).toBe(
      true,
    )
  })

  it('legacy 59 op actief abonnement wordt 69 bij weergave starter', () => {
    expect(tenantPlanMonthlyEuros('starter', { price_monthly: 59, plan: 'starter' })).toBe(69)
    expect(tenantPlanMonthlyEuros('pro', { price_monthly: 59, plan: 'pro' })).toBe(99)
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

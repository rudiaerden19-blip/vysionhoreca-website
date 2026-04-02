import { parseEnabledModulesJson, isTrialSubscriptionActive } from '@/lib/tenant-modules'

describe('tenant-modules parsing', () => {
  it('parseEnabledModulesJson returns null for invalid input', () => {
    expect(parseEnabledModulesJson(null)).toBeNull()
    expect(parseEnabledModulesJson('not-json')).toBeNull()
  })

  it('parseEnabledModulesJson accepts record of booleans', () => {
    const parsed = parseEnabledModulesJson({ kassa: true, rapporten: false })
    expect(parsed).toEqual({ kassa: true, rapporten: false })
  })

  it('isTrialSubscriptionActive respects trial_ends_at', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    const future = new Date(Date.now() + 86400000 * 30).toISOString()
    expect(
      isTrialSubscriptionActive(null, {
        subscription_status: 'trial',
        trial_ends_at: past,
      })
    ).toBe(false)
    expect(
      isTrialSubscriptionActive(null, {
        subscription_status: 'trial',
        trial_ends_at: future,
      })
    ).toBe(true)
  })
})

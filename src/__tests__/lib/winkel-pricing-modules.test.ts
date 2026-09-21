import {
  WINKEL_PRICING_MODULE_IDS,
  isWinkelMarketingBranch,
  winkelPricingModuleKey,
} from '@/lib/winkel-pricing-modules'

describe('winkel pricing modules', () => {
  it('lists the shop modules in a stable order', () => {
    expect([...WINKEL_PRICING_MODULE_IDS]).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ])
    expect(winkelPricingModuleKey(4)).toBe('winkelSite.pricingModules.4')
  })

  it('treats stored winkel and retail as shop marketing', () => {
    expect(isWinkelMarketingBranch('winkel')).toBe(true)
    expect(isWinkelMarketingBranch('retail')).toBe(true)
    expect(isWinkelMarketingBranch('horeca')).toBe(false)
    expect(isWinkelMarketingBranch('other')).toBe(false)
    expect(isWinkelMarketingBranch(null)).toBe(false)
  })
})

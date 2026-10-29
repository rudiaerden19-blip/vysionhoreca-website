import {
  isReportsAdminRestPath,
  lagoonKassaMenuPinRequired,
  lagoonStrictReportsPinEnabled,
} from '@/lib/lagoon-reports-pin-gate'

describe('lagoon-reports-pin-gate', () => {
  it('strict pin alleen voor thelagoon', () => {
    expect(lagoonStrictReportsPinEnabled('thelagoon')).toBe(true)
    expect(lagoonStrictReportsPinEnabled('the-lagoon')).toBe(true)
    expect(lagoonStrictReportsPinEnabled('demo-frituur')).toBe(false)
  })

  it('kassa menu pin voor slug, settings slug of zaaknaam The Lagoon', () => {
    expect(lagoonKassaMenuPinRequired('thelagoon')).toBe(true)
    expect(
      lagoonKassaMenuPinRequired('other-slug', {
        settingsTenantSlug: 'the-lagoon',
      }),
    ).toBe(true)
    expect(
      lagoonKassaMenuPinRequired('other-slug', { businessName: 'The Lagoon' }),
    ).toBe(true)
    expect(lagoonKassaMenuPinRequired('demo-frituur', { businessName: 'Demo Frituur' })).toBe(
      false,
    )
  })

  it('herkent rapport-module paden', () => {
    expect(isReportsAdminRestPath('/rapporten')).toBe(true)
    expect(isReportsAdminRestPath('/z-rapport')).toBe(true)
    expect(isReportsAdminRestPath('/verkoop')).toBe(true)
    expect(isReportsAdminRestPath('/kassa')).toBe(false)
  })
})

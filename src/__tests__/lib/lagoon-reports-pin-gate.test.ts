import {
  isLagoonStrictReportsAdminRestPath,
  lagoonStrictReportsPinEnabled,
} from '@/lib/lagoon-reports-pin-gate'

describe('lagoon-reports-pin-gate', () => {
  it('strict pin alleen voor thelagoon', () => {
    expect(lagoonStrictReportsPinEnabled('thelagoon')).toBe(true)
    expect(lagoonStrictReportsPinEnabled('the-lagoon')).toBe(true)
    expect(lagoonStrictReportsPinEnabled('demo-frituur')).toBe(false)
  })

  it('herkent rapport-module paden', () => {
    expect(isLagoonStrictReportsAdminRestPath('/rapporten')).toBe(true)
    expect(isLagoonStrictReportsAdminRestPath('/z-rapport')).toBe(true)
    expect(isLagoonStrictReportsAdminRestPath('/verkoop')).toBe(true)
    expect(isLagoonStrictReportsAdminRestPath('/kassa')).toBe(false)
  })
})

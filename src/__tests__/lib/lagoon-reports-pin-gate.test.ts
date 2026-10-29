import {
  isReportsAdminRestPath,
  lagoonStrictReportsPinEnabled,
} from '@/lib/lagoon-reports-pin-gate'

describe('lagoon-reports-pin-gate', () => {
  it('strict pin alleen voor thelagoon', () => {
    expect(lagoonStrictReportsPinEnabled('thelagoon')).toBe(true)
    expect(lagoonStrictReportsPinEnabled('the-lagoon')).toBe(true)
    expect(lagoonStrictReportsPinEnabled('demo-frituur')).toBe(false)
  })

  it('herkent rapport-module paden', () => {
    expect(isReportsAdminRestPath('/rapporten')).toBe(true)
    expect(isReportsAdminRestPath('/z-rapport')).toBe(true)
    expect(isReportsAdminRestPath('/verkoop')).toBe(true)
    expect(isReportsAdminRestPath('/kassa')).toBe(false)
  })
})

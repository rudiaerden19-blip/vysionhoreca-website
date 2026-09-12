import { zReportSendArticlesToAccountant } from '@/lib/z-report-accountant-articles'

describe('zReportSendArticlesToAccountant', () => {
  it('is standaard aan (andere tenants merken niets)', () => {
    expect(zReportSendArticlesToAccountant(undefined)).toBe(true)
    expect(zReportSendArticlesToAccountant(null)).toBe(true)
    expect(zReportSendArticlesToAccountant(true)).toBe(true)
    expect(zReportSendArticlesToAccountant('true')).toBe(true)
  })

  it('zet uit bij expliciet nee', () => {
    expect(zReportSendArticlesToAccountant(false)).toBe(false)
    expect(zReportSendArticlesToAccountant('false')).toBe(false)
    expect(zReportSendArticlesToAccountant(0)).toBe(false)
  })
})

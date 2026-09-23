import {
  zReportSendArticlesToAccountant,
  zReportShowSoldArticlesForTenant,
} from '@/lib/z-report-accountant-articles'

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

  it('verbergt artikelen altijd voor t ont-bijthuisje', () => {
    expect(zReportShowSoldArticlesForTenant('tontbijthuisje', true)).toBe(false)
    expect(zReportShowSoldArticlesForTenant('tontbijthuisje', undefined)).toBe(false)
    expect(zReportShowSoldArticlesForTenant('andere-zaak', true)).toBe(true)
  })
})

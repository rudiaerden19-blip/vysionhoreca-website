import {
  Z_REPORT_TONTBIJTHUISJE_SLUG,
  zReportShowDayReceiptsPanel,
} from '@/lib/z-report-tenant-ui'

describe('z-report tenant UI', () => {
  it('verbergt Bonnen vandaag voor t ontbijthuisje', () => {
    expect(zReportShowDayReceiptsPanel(Z_REPORT_TONTBIJTHUISJE_SLUG)).toBe(false)
    expect(zReportShowDayReceiptsPanel('andere-zaak')).toBe(true)
  })
})

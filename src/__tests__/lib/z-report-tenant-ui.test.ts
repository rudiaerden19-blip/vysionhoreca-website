import {
  Z_REPORT_TONTBIJTHUISJE_SLUG,
  tenantBookDateVisible,
  zReportShowDayReceiptsPanel,
} from '@/lib/z-report-tenant-ui'

describe('z-report tenant UI', () => {
  it('verbergt Bonnen vandaag voor t ontbijthuisje', () => {
    expect(zReportShowDayReceiptsPanel(Z_REPORT_TONTBIJTHUISJE_SLUG)).toBe(false)
    expect(zReportShowDayReceiptsPanel('andere-zaak')).toBe(true)
  })

  it('toont t ontbijthuisje pas vanaf 15 september 2026', () => {
    expect(tenantBookDateVisible(Z_REPORT_TONTBIJTHUISJE_SLUG, '2026-09-14')).toBe(false)
    expect(tenantBookDateVisible(Z_REPORT_TONTBIJTHUISJE_SLUG, '2026-09-15')).toBe(true)
    expect(tenantBookDateVisible('andere-zaak', '2026-09-01')).toBe(true)
  })
})

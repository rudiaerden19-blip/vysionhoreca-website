import {
  formatKassaDailyAuditReportPlain,
  resolveKassaDailyAuditTenantSlugs,
  type KassaDailyAuditReport,
} from '@/lib/kassa-daily-audit-report'

describe('kassa-daily-audit-report', () => {
  it('defaults blonkys tenant slugs', () => {
    const slugs = resolveKassaDailyAuditTenantSlugs()
    expect(slugs).toContain('blonkys-restaurant')
    expect(slugs).toContain('blonkyseethuis')
  })

  it('formats plain report with sales and deletes', () => {
    const report: KassaDailyAuditReport = {
      tenantSlug: 'blonkys-restaurant',
      businessName: 'Blonkys',
      fiscalDate: '2026-10-18',
      rangeStartUtc: '2026-10-17T22:00:00.000Z',
      rangeEndUtc: '2026-10-18T20:00:00.000Z',
      generatedAt: '2026-10-18T20:00:00.000Z',
      sales: [
        {
          orderId: 'a',
          orderNumber: 1042,
          total: 18.5,
          paymentStatus: 'paid',
          status: 'confirmed',
          paymentMethod: 'CASH',
          orderType: 'DINE_IN',
          createdAt: '2026-10-18T12:00:00.000Z',
          staffId: null,
          staffName: null,
        },
      ],
      salesTotalIncl: 18.5,
      salesCount: 1,
      deleted: [
        {
          deletedAt: '2026-10-18T15:00:00.000Z',
          actorEmail: 'owner@example.com',
          actorType: 'owner',
          orderId: 'b',
          orderNumber: 1040,
          total: 25,
          paymentStatus: 'paid',
          status: 'confirmed',
          staffId: null,
          notes: null,
        },
      ],
      changed: [],
    }
    const text = formatKassaDailyAuditReportPlain([report])
    expect(text).toContain('bon #1042')
    expect(text).toContain('18,50')
    expect(text).toContain('VERWIJDERDE BONNEN')
    expect(text).toContain('bon #1040')
  })
})

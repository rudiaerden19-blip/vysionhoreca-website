import {
  computeKassaOrderNumberGaps,
  formatKassaDailyAuditReportPlain,
  resolveKassaDailyAuditRecipientEmails,
  resolveKassaDailyAuditTenantSlugs,
  type KassaDailyAuditReport,
} from '@/lib/kassa-daily-audit-report'

describe('kassa-daily-audit-report', () => {
  it('defaults audit email to Blonkys owner when env unset', () => {
    const prev = process.env.KASSA_DAILY_AUDIT_EMAIL
    delete process.env.KASSA_DAILY_AUDIT_EMAIL
    expect(resolveKassaDailyAuditRecipientEmails()).toEqual(['rudiaerden19@gmail.com'])
    if (prev) process.env.KASSA_DAILY_AUDIT_EMAIL = prev
  })

  it('finds order number gaps', () => {
    const gaps = computeKassaOrderNumberGaps([
      {
        orderId: 'a',
        orderNumber: 10,
        total: 1,
        paymentStatus: 'paid',
        status: 'confirmed',
        paymentMethod: 'CASH',
        orderType: 'DINE_IN',
        createdAt: '',
        staffId: null,
        staffName: null,
      },
      {
        orderId: 'b',
        orderNumber: 12,
        total: 1,
        paymentStatus: 'paid',
        status: 'confirmed',
        paymentMethod: 'CASH',
        orderType: 'DINE_IN',
        createdAt: '',
        staffId: null,
        staffName: null,
      },
    ])
    expect(gaps).toEqual([11])
  })

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
      alerts: ['test alert'],
    }
    const text = formatKassaDailyAuditReportPlain([report])
    expect(text).toContain('bon #1042')
    expect(text).toContain('18,50')
    expect(text).toContain('SIGNALEN')
    expect(text).toContain('VERWIJDERDE BONNEN')
    expect(text).toContain('bon #1040')
  })
})

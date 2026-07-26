import {
  buildZReportMonthDayRows,
  fiscalReportDateForOrderCreatedAt,
  getLastDayOfMonthYmd,
  listMonthDaysUpTo,
  parseZReportMonthSentLog,
  sumZReportMonthAmounts,
  type ZReportMonthDayRow,
} from '@/lib/z-report-month'
import type { ZReportVatContext } from '@/lib/z-report-vat-context'

const emptyVatContext: ZReportVatContext = {
  categoryById: new Map(),
  productCategoryById: new Map(),
  productCategoryByNormalizedName: new Map(),
}

describe('fiscalReportDateForOrderCreatedAt', () => {
  it('kent fiscale dag voor order in middag', () => {
    const fiscal = fiscalReportDateForOrderCreatedAt('2026-07-15T14:00:00.000Z')
    expect(fiscal).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('retourneert null voor ongeldige datum', () => {
    expect(fiscalReportDateForOrderCreatedAt('invalid')).toBeNull()
  })
})

describe('listMonthDaysUpTo', () => {
  it('lijst dagen tot cap binnen de maand', () => {
    const days = listMonthDaysUpTo('2026-07', '2026-07-05')
    expect(days).toEqual([
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
    ])
  })

  it('geeft laatste dag van maand als cap na maand', () => {
    const last = getLastDayOfMonthYmd('2026-07')
    const days = listMonthDaysUpTo('2026-07', '2026-08-15')
    expect(days[days.length - 1]).toBe(last)
  })
})

describe('sumZReportMonthAmounts', () => {
  it('telt dagrijen op', () => {
    const day: ZReportMonthDayRow = {
      date: '2026-07-01',
      orderCount: 2,
      subtotalExcl: 100,
      totalIncl: 106,
      taxByRate: { 6: 6, 9: 0, 12: 0, 21: 0 },
      baseByRate: { 6: 100, 9: 0, 12: 0, 21: 0 },
      cashPayments: 50,
      cardPayments: 56,
      onlinePayments: 0,
    }
    const sum = sumZReportMonthAmounts([day, { ...day, date: '2026-07-02' }])
    expect(sum.orderCount).toBe(4)
    expect(sum.totalIncl).toBe(212)
    expect(sum.taxByRate[6]).toBe(12)
    expect(sum.cashPayments).toBe(100)
  })
})

describe('parseZReportMonthSentLog', () => {
  it('parseert geldige entries', () => {
    const log = parseZReportMonthSentLog({
      '2026-07': { sentAt: '2026-07-31T10:00:00Z', to: 'boek@example.be' },
      bad: { sentAt: '' },
    })
    expect(log['2026-07']).toEqual({
      sentAt: '2026-07-31T10:00:00Z',
      to: 'boek@example.be',
    })
    expect(log.bad).toBeUndefined()
  })

  it('retourneert leeg object voor ongeldige input', () => {
    expect(parseZReportMonthSentLog(null)).toEqual({})
    expect(parseZReportMonthSentLog('x')).toEqual({})
  })
})

describe('buildZReportMonthDayRows', () => {
  it('bouwt rijen alleen voor dagen met omzet', () => {
    const rows = buildZReportMonthDayRows(
      [
        {
          id: 'o1',
          tenant_slug: 'demo',
          total: 10.6,
          created_at: '2026-07-10T12:00:00.000Z',
          order_type: 'pickup',
          status: 'confirmed',
          payment_status: 'paid',
          items: [{ name: 'Friet', price: 10.6, quantity: 1 }],
        } as never,
      ],
      '2026-07',
      '2026-07-31',
      6,
      emptyVatContext,
    )
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows[0].totalIncl).toBeGreaterThan(0)
  })
})

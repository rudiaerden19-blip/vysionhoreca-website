import {
  STAFF_SALES_VISIBLE_DAYS,
  buildStaffSalesDayLines,
  isStaffSalesDateVisible,
  staffSalesDayTotal,
  staffSalesVisibleRange,
} from '@/lib/kassa-staff-sales-day'

describe('verkoop per medewerker', () => {
  it('laat 30 dagen toe, inclusief vandaag', () => {
    expect(STAFF_SALES_VISIBLE_DAYS).toBe(30)
    expect(staffSalesVisibleRange('2026-10-31')).toEqual({
      minYmd: '2026-10-02',
      maxYmd: '2026-10-31',
    })
    expect(isStaffSalesDateVisible('2026-10-02', '2026-10-31')).toBe(true)
    expect(isStaffSalesDateVisible('2026-10-31', '2026-10-31')).toBe(true)
    expect(isStaffSalesDateVisible('2026-10-01', '2026-10-31')).toBe(false)
    expect(isStaffSalesDateVisible('2026-11-01', '2026-10-31')).toBe(false)
  })

  it('telt betaalde bonnen per medewerker en houdt €0 voor wie niets verkocht', () => {
    const lines = buildStaffSalesDayLines(
      [
        { id: 'a', name: 'Amber' },
        { id: 'b', name: 'Bo' },
      ],
      [{ id: 'c', name: 'Celine' }],
      [
        { staffId: 'a', total: 10.1 },
        { staffId: 'a', total: 0.2 },
        { staffId: 'c', total: 5 },
        { staffId: null, total: 99 },
        { staffId: '  ', total: 4 },
      ],
    )

    expect(lines.map((line) => [line.name, line.total, line.orderCount])).toEqual([
      ['Amber', 10.3, 2],
      ['Celine', 5, 1],
      ['Bo', 0, 0],
    ])
    expect(staffSalesDayTotal(lines)).toBe(15.3)
  })
})

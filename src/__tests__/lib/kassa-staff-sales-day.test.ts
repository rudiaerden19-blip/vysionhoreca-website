import {
  STAFF_SALES_VISIBLE_DAYS,
  buildStaffSalesDayLines,
  isStaffSalesDateVisible,
  resolveStaffSalesWindow,
  staffSalesDayTotal,
  staffSalesVisibleRange,
} from '@/lib/kassa-staff-sales-day'
import { getDateBoundsForBelgium } from '@/lib/belgium-date-bounds'
import { getTenantBusinessDayBounds, type TenantHourRow } from '@/lib/tenant-business-day'

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

  it('laat andere tenants op de kalenderdag 00:00–23:59', () => {
    const now = new Date('2026-11-07T00:30:00.000Z')
    const resolved = resolveStaffSalesWindow({
      requestedYmd: '2026-11-07',
      now,
      lagoon: false,
      hours: overnightHours(),
    })
    expect(resolved).toEqual({
      date: '2026-11-07',
      today: '2026-11-07',
      ...getDateBoundsForBelgium('2026-11-07'),
    })
  })

  it('telt The Lagoon na middernacht nog bij de open shift', () => {
    const hours = overnightHours()
    const now = new Date('2026-11-07T00:30:00.000Z')
    const resolved = resolveStaffSalesWindow({
      requestedYmd: '2026-11-07',
      now,
      lagoon: true,
      hours,
    })
    expect(resolved).toEqual({
      date: '2026-11-06',
      today: '2026-11-06',
      ...getTenantBusinessDayBounds('2026-11-06', hours),
    })
    expect(resolved!.endUTC > getDateBoundsForBelgium('2026-11-06').endUTC).toBe(true)
  })
})

function overnightHours(): TenantHourRow[] {
  return Array.from({ length: 7 }, (_, day_of_week) => ({
    day_of_week,
    is_open: true,
    open_time: '17:00',
    close_time: '03:00',
  }))
}

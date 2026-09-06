import {
  businessDayForOrder,
  getTenantBusinessDayBounds,
  type TenantHourRow,
} from '@/lib/tenant-business-day'

const week = (open: string, close: string): TenantHourRow[] =>
  [0, 1, 2, 3, 4, 5, 6].map((day_of_week) => ({
    day_of_week,
    is_open: true,
    open_time: open,
    close_time: close,
  }))

describe('tenant business day', () => {
  it('8u–01u: ochtend hoort bij vandaag, niet gisteren', () => {
    const hours = week('08:00', '01:00')
    expect(businessDayForOrder('2026-09-06T08:00:00.000Z', hours)).toBe('2026-09-06')
  })

  it('8u–01u: 00:30 hoort bij gisteren', () => {
    const hours = week('08:00', '01:00')
    expect(businessDayForOrder('2026-09-05T22:30:00.000Z', hours)).toBe('2026-09-05')
  })

  it('17u–01u: 10u zondag is zondag, niet zaterdag', () => {
    const hours = week('17:00', '01:00')
    expect(businessDayForOrder('2026-09-06T08:00:00.000Z', hours)).toBe('2026-09-06')
  })

  it('bounds sluiten de volgende ochtend bij over-middernacht', () => {
    const hours = week('08:00', '01:00')
    const b = getTenantBusinessDayBounds('2026-09-06', hours)
    expect(b.endUTC > b.startUTC).toBe(true)
  })
})

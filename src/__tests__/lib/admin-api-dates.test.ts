import {
  addDaysToBelgiumYMD,
  getBelgiumDateString,
  getDateBoundsForBelgium,
} from '@/lib/admin-api'

describe('admin-api date helpers', () => {
  it('getDateBoundsForBelgium returns ISO strings bracketing local day', () => {
    const { startUTC, endUTC } = getDateBoundsForBelgium('2026-06-15')
    expect(startUTC).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(endUTC).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(new Date(endUTC).getTime()).toBeGreaterThan(new Date(startUTC).getTime())
  })

  it('addDaysToBelgiumYMD shifts calendar days', () => {
    expect(addDaysToBelgiumYMD('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDaysToBelgiumYMD('2026-03-01', 1)).toBe('2026-03-02')
  })

  it('getBelgiumDateString yields YYYY-MM-DD', () => {
    const s = getBelgiumDateString(new Date('2026-07-04T12:00:00Z'))
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

/** Periode voor reserveringsrapporten (kassa admin) — multi-tenant data wordt client-side gefilterd op tenant_slug. */

export type ReservationReportPeriod = 'dag' | 'week' | 'maand' | 'jaar'

function fmtDate(dt: Date): string {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function reservationReportRange(
  period: ReservationReportPeriod,
  anchorDate: string,
  monthIndex: number,
  year: number,
): { from: string; to: string } {
  if (period === 'dag') {
    return { from: anchorDate, to: anchorDate }
  }
  if (period === 'week') {
    const d = new Date(`${anchorDate}T12:00:00`)
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
    const mon = new Date(d)
    mon.setDate(d.getDate() - dow)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { from: fmtDate(mon), to: fmtDate(sun) }
  }
  if (period === 'maand') {
    const from = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
    const to = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(new Date(year, monthIndex + 1, 0).getDate()).padStart(2, '0')}`
    return { from, to }
  }
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

export function filterReservationsByDateRange<T extends { reservation_date: string }>(
  rows: T[],
  from: string,
  to: string,
): T[] {
  return rows.filter((r) => r.reservation_date >= from && r.reservation_date <= to)
}

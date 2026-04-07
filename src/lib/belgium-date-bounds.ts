/**
 * Belgium calendar bounds for reporting (Europe/Brussels).
 * Lightweight module — avoid importing heavy admin-api from edge/server routes.
 */

export function getDateBoundsForBelgium(dateStr: string): { startUTC: string; endUTC: string } {
  const [year, month, day] = dateStr.split('-').map(Number)
  const isDST = isBelgiumDST(year, month, day)
  const belgiumOffsetHours = isDST ? 2 : 1
  const startHourUTC = 24 - belgiumOffsetHours
  const startDate = new Date(Date.UTC(year, month - 1, day - 1, startHourUTC, 0, 0))
  const endHourUTC = 23 - belgiumOffsetHours
  const endDate = new Date(Date.UTC(year, month - 1, day, endHourUTC, 59, 59))
  return {
    startUTC: startDate.toISOString(),
    endUTC: endDate.toISOString(),
  }
}

function isBelgiumDST(year: number, month: number, day: number): boolean {
  const marchLast = new Date(year, 2, 31)
  const marchLastSunday = 31 - marchLast.getDay()
  const octLast = new Date(year, 9, 31)
  const octLastSunday = 31 - octLast.getDay()
  const dstStart = new Date(year, 2, marchLastSunday, 2, 0, 0)
  const dstEnd = new Date(year, 9, octLastSunday, 3, 0, 0)
  const checkDate = new Date(year, month - 1, day, 12, 0, 0)
  return checkDate >= dstStart && checkDate < dstEnd
}

export function getBelgiumDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' })
}

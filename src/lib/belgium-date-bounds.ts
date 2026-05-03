/**
 * Belgium calendar bounds and Z-rapport fiscal-day ranges (Europe/Brussels).
 * Lightweight module — routes import this instead of `admin-api` where possible.
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

/** Voeg dagen toe aan een YYYY-MM-DD (kalender in Europe/Brussels). */
export function addDaysToBelgiumYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' })
}

/**
 * Fiscale dag grenzen voor Z-Rapport (GKS compliant)
 * Een fiscale dag loopt van 00:00 tot 12:00 de VOLGENDE dag.
 * Nachtbestellingen (bv. 01:00u) horen bij de juiste dag; afsluiten uiterlijk 12u de volgende dag.
 */
export function getZRapportDateBounds(dateStr: string): { startUTC: string; endUTC: string } {
  const [year, month, day] = dateStr.split('-').map(Number)

  const isDST = isBelgiumDST(year, month, day)
  const belgiumOffsetHours = isDST ? 2 : 1

  const startDate = new Date(Date.UTC(year, month - 1, day - 1, 24 - belgiumOffsetHours, 0, 0))

  const endDate = new Date(Date.UTC(year, month - 1, day + 1, 12 - belgiumOffsetHours, 0, 0))

  return {
    startUTC: startDate.toISOString(),
    endUTC: endDate.toISOString(),
  }
}

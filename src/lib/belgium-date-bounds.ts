/**
 * Belgium calendar bounds and Z-rapport fiscal-day ranges (Europe/Brussels).
 * Lightweight module — routes import this instead of `admin-api`where possible.
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
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels'})
}

/** Voeg dagen toe aan een YYYY-MM-DD (kalender in Europe/Brussels). */
export function addDaysToBelgiumYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels'})
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

function brusselsHour(utc: Date): number {
  return Number(
    utc.toLocaleString('en-GB', {
      timeZone: 'Europe/Brussels',
      hour: 'numeric',
      hour12: false,
    }),
  )
}

/**
 * Fiscale werkdag voor een order — zelfde als dag-Z-rapport (`getZRapportDateBounds`).
 * Werkdag X = X 00:00 t/m X+1 12:00 (Europe/Brussels). Bonnen na middernacht vóór 12:00
 * horen bij de vorige werkdag, niet bij de nieuwe kalenderdag.
 */
export function fiscalReportDateForOrderCreatedAt(createdAt: string): string | null {
  const t = new Date(createdAt)
  if (Number.isNaN(t.getTime())) return null

  const center = getBelgiumDateString(t)
  const hour = brusselsHour(t)
  const fiscalYmd = hour < 12 ? addDaysToBelgiumYMD(center, -1) : center

  const { startUTC, endUTC } = getZRapportDateBounds(fiscalYmd)
  if (t >= new Date(startUTC) && t <= new Date(endUTC)) return fiscalYmd

  for (const ymd of [addDaysToBelgiumYMD(center, -1), center, addDaysToBelgiumYMD(center, 1)]) {
    const b = getZRapportDateBounds(ymd)
    if (t >= new Date(b.startUTC) && t <= new Date(b.endUTC)) return ymd
  }

  return fiscalYmd
}

/**
 * Laatste **afgesloten** fiscale werkdag (Europe/Brussels).
 * Fiscale dag D sluit om D+1 12:00 — cron/archive moet niet de kalenderdag gebruiken.
 */
export function lastCompletedFiscalReportDate(now: Date = new Date()): string {
  const center = getBelgiumDateString(now)
  const hour = brusselsHour(now)
  return hour >= 12 ? addDaysToBelgiumYMD(center, -1) : addDaysToBelgiumYMD(center, -2)
}

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

/** Lokaal België YYYY-MM-DD + HH:MM → UTC ISO. */
export function belgiumLocalToUtcIso(ymd: string, hm: string): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const [hh, mm] = (hm || '00:00').slice(0, 5).split(':').map(Number)
  const offset = isBelgiumDST(year, month, day) ? 2 : 1
  return new Date(Date.UTC(year, month - 1, day, (hh || 0) - offset, mm || 0, 0, 0)).toISOString()
}

/** Huidige klok in België als HH:MM (24u). */
export function getBelgiumTimeHM(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Brussels',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

/** Maandag = 0 … zondag = 6, kalender Europe/Brussels. */
export function getBelgiumWeekdayMon0(date: Date = new Date()): number {
  const ymd = getBelgiumDateString(date)
  const [y, m, d] = ymd.split('-').map(Number)
  const jsDay = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay()
  return jsDay === 0 ? 6 : jsDay - 1
}

/** Voeg dagen toe aan een YYYY-MM-DD (kalender in Europe/Brussels). */
export function addDaysToBelgiumYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels'})
}

/**
 * Fiscale dag grenzen voor Z-Rapport (GKS compliant).
 * Werkdag met label D = D 12:00 t/m D+1 12:00 (Europe/Brussels).
 * Bonnen na middernacht vóór 12:00 horen bij werkdag D−1 (niet bij D).
 */
export function getZRapportDateBounds(dateStr: string): { startUTC: string; endUTC: string } {
  const [year, month, day] = dateStr.split('-').map(Number)

  const isDST = isBelgiumDST(year, month, day)
  const belgiumOffsetHours = isDST ? 2 : 1

  const startDate = new Date(Date.UTC(year, month - 1, day, 12 - belgiumOffsetHours, 0, 0))
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
 * Fiscale werkdag voor een order — zelfde venster als `getZRapportDateBounds`.
 * Werkdag D = D 12:00 t/m D+1 12:00 (Europe/Brussels).
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

/** Fiscale werkdag die `now` bevat — zelfde label als Z-rapport / bonnen. */
export function getCurrentFiscalReportDate(now: Date = new Date()): string {
  return fiscalReportDateForOrderCreatedAt(now.toISOString()) ?? getBelgiumDateString(now)
}

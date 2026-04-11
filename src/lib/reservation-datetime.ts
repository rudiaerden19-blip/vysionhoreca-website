/**
 * Reservatiedatum/tijd in de **lokale tijdzone van de browser** (klant).
 * Voorkomt UTC-bugs van `toISOString().split('T')[0]` bij min/max op date-inputs.
 */

export function localCalendarDateString(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function ymdSortKey(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd ?? '').trim())
  if (!m) return null
  return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3])
}

/** -1 / 0 / 1, of null bij ongeldige invoer */
export function compareYmd(a: string, b: string): number | null {
  const ca = ymdSortKey(a)
  const cb = ymdSortKey(b)
  if (ca == null || cb == null) return null
  if (ca < cb) return -1
  if (ca > cb) return 1
  return 0
}

/**
 * Parseert `YYYY-MM-DD` + `H:mm` of `HH:mm` als lokale wall-clock.
 */
export function parseReservationLocalDateTimeMs(dateYmd: string, timeHm: string): number | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateYmd ?? '').trim())
  const tm = /^(\d{1,2}):(\d{2})$/.exec(String(timeHm ?? '').trim())
  if (!dm || !tm) return null
  const y = Number(dm[1])
  const mo = Number(dm[2]) - 1
  const d = Number(dm[3])
  const hh = Number(tm[1])
  const mm = Number(tm[2])
  if ([y, mo, d, hh, mm].some(n => !Number.isFinite(n))) return null
  if (mo < 0 || mo > 11 || d < 1 || d > 31 || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null
  const dt = new Date(y, mo, d, hh, mm, 0, 0)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null
  return dt.getTime()
}

/**
 * True = niet toegestaan: ontbrekende parse, of slot strikt vóór (nu + minAdvanceHours).
 * Publieke boeking: minAdvanceHours komt uit reservation_settings (default 0 = vanaf nu).
 */
export function isPublicReservationSlotTooSoon(
  dateYmd: string,
  timeHm: string,
  minAdvanceHours: number
): boolean {
  const slotMs = parseReservationLocalDateTimeMs(dateYmd, timeHm)
  if (slotMs == null) return true
  const hours = Math.max(0, Number(minAdvanceHours) || 0)
  const minMs = Date.now() + hours * 3600000
  return slotMs < minMs
}

/** Eerste kalenderdag waarop een slot met minAdvanceHours nog mogelijk is (lokaal). */
export function minReservationDateYmd(minAdvanceHours: number): string {
  const minInstant = new Date(Date.now() + Math.max(0, Number(minAdvanceHours) || 0) * 3600000)
  return localCalendarDateString(minInstant)
}

/** Laatste toegestane kalenderdag (vandaag + maxAdvanceDays, lokaal). */
export function maxReservationDateYmd(maxAdvanceDays: number): string {
  const d = new Date()
  const days = Math.max(1, Number(maxAdvanceDays) || 60)
  d.setDate(d.getDate() + days)
  return localCalendarDateString(d)
}

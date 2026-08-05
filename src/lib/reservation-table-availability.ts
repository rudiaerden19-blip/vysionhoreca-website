/**
 * Tafelbeschikbaarheid op datum + tijd (niet “nu” tenzij CHECKED_IN vandaag).
 * Gedeeld door online reserveren en kassa-modals.
 */

import { localCalendarDateString } from '@/lib/reservation-datetime'

export type ReservationTableBlocker = {
  id?: string
  reservation_date: string
  reservation_time: string
  duration_minutes?: number
  table_number?: string | number | null
  status: string
  guest_name?: string
}

export function parseReservationHmToMinutes(hm: string): number {
  const raw = (hm || '12:00').trim().slice(0, 8)
  const m = raw.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return 12 * 60
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

export function formatMinutesAsHm(totalMinutes: number): string {
  const dayMin = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const hh = Math.floor(dayMin / 60)
  const mm = dayMin % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function reservationBlocksTableStatus(status: string): boolean {
  const s = (status || '').toUpperCase()
  return (
    s !== 'CANCELLED' &&
    s !== 'COMPLETED' &&
    s !== 'NO_SHOW' &&
    s !== 'WAITLIST'
  )
}

/**
 * Eindtijd van een reservatie op de tafel. CHECKED_IN vandaag: minstens tot “nu”
 * zolang gasten nog binnen zijn (fysiek bezet na geplande duur).
 */
export function reservationOccupiedEndMinutes(
  r: ReservationTableBlocker,
  opts: { defaultDurationMinutes?: number; now?: Date } = {},
): number {
  const start = parseReservationHmToMinutes(r.reservation_time)
  const dur = Math.max(15, r.duration_minutes || opts.defaultDurationMinutes || 90)
  let end = start + dur
  const status = (r.status || '').toUpperCase()
  const now = opts.now ?? new Date()
  if (status === 'CHECKED_IN' && r.reservation_date === localCalendarDateString(now)) {
    const nowMin = now.getHours() * 60 + now.getMinutes()
    if (nowMin >= start) end = Math.max(end, nowMin)
  }
  return end
}

export type TableSlotAvailabilityParams = {
  tableNumber: string | number
  date: string
  slotStartHm: string
  slotDurationMinutes: number
  bufferMinutes?: number
  defaultDurationMinutes?: number
  excludeReservationId?: string
  /** Buffer aan beide kanten van bestaande reservaties (kassa auto-assign). */
  symmetricBuffer?: boolean
  now?: Date
}

/** Eerste conflicterende reservatie, anders null (= tafel vrij op dit tijdstip). */
export function findReservationBlockingTableSlot(
  reservations: ReservationTableBlocker[],
  params: TableSlotAvailabilityParams,
): ReservationTableBlocker | null {
  if (!params.date || !params.slotStartHm) return null
  const startMin = parseReservationHmToMinutes(params.slotStartHm)
  const endMin =
    startMin + Math.max(15, params.slotDurationMinutes) + Math.max(0, params.bufferMinutes ?? 0)
  const buffer = Math.max(0, params.bufferMinutes ?? 0)
  const now = params.now ?? new Date()

  for (const r of reservations) {
    if (params.excludeReservationId && r.id === params.excludeReservationId) continue
    if (!reservationBlocksTableStatus(r.status)) continue
    if (r.reservation_date !== params.date) continue
    if (String(r.table_number ?? '') !== String(params.tableNumber)) continue

    const rStart = parseReservationHmToMinutes(r.reservation_time)
    const rEnd = reservationOccupiedEndMinutes(r, {
      defaultDurationMinutes: params.defaultDurationMinutes,
      now,
    })
    const rEndWithBuffer = rEnd + (params.symmetricBuffer ? buffer : 0)

    if (startMin < rEndWithBuffer && endMin > rStart) return r
  }
  return null
}

export function getTableAvailabilityAtSlot(
  reservations: ReservationTableBlocker[],
  params: TableSlotAvailabilityParams,
): { bezet: boolean; door?: string; tot?: string } {
  const conflict = findReservationBlockingTableSlot(reservations, params)
  if (!conflict) return { bezet: false }
  const rEnd = reservationOccupiedEndMinutes(conflict, {
    defaultDurationMinutes: params.defaultDurationMinutes,
    now: params.now,
  })
  return {
    bezet: true,
    door: conflict.guest_name,
    tot: formatMinutesAsHm(rEnd),
  }
}

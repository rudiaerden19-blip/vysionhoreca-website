/** Types en pure helpers voor KassaReservationsView — los van UI voor testbaarheid en kleinere bundles. */

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED'
  | 'WAITLIST'

export type ViewMode =
  | 'today'
  | 'calendar'
  | 'month'
  | 'list'
  | 'floorplan'
  | 'timeline'
  | 'guests'
  | 'stats'
  | 'settings'
  | 'reservations'

export interface Reservation {
  id: string
  tenant_slug: string
  guest_name: string
  guest_phone?: string
  guest_email?: string
  party_size: number
  reservation_date: string
  reservation_time: string
  duration_minutes: number
  table_number?: string
  notes?: string
  special_requests?: string
  occasion?: string
  status: ReservationStatus
  checked_in_at?: string
  completed_at?: string
  total_spent: number
  created_at?: string
  payment_status?: string
  stripe_session_id?: string
  stripe_payment_method_id?: string
  deposit_amount?: number
  waitlist_position?: number
}

/**
 * Duur uit Supabase/Excel: integer minuten, of decimale uren (1,5 / 1.5 = 90 min).
 * Geen parseInt op "1.5" — dat werd 1 minuut en een te korte balk.
 */
export function parseDurationMinutesFromRaw(raw: unknown, fallback: number): number {
  if (raw == null || raw === '') return fallback
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0) return fallback
    if (raw < 24 && raw % 1 !== 0) return Math.round(raw * 60)
    return Math.round(raw)
  }
  const s = String(raw).trim().replace(',', '.')
  if (!s) return fallback
  const n = parseFloat(s)
  if (!Number.isFinite(n) || n <= 0) return fallback
  if (n < 24 && n % 1 !== 0) return Math.round(n * 60)
  return Math.round(n)
}

/** Plattegrond-label: start- en eindtijd obv reservatieduur (per reservatie of default zaak). */
export function formatFloorPlanTimeRange(reservationTime: string, durationMinutes: number): string {
  const raw = (reservationTime || '12:00').trim().slice(0, 8)
  const m = raw.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return raw.slice(0, 5)
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (!Number.isFinite(h) || !Number.isFinite(min)) return raw.slice(0, 5)
  const dur = Math.max(15, Math.round(durationMinutes || 90))
  const startTotal = h * 60 + min
  const endTotal = startTotal + dur
  const dayMin = ((endTotal % (24 * 60)) + (24 * 60)) % (24 * 60)
  const endH = Math.floor(dayMin / 60)
  const endM = dayMin % 60
  const startStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  const endStr = `${endH}u${String(endM).padStart(2, '0')}`
  return `${startStr} tot ${endStr}`
}

const STATUS_RING_FADE_LAST_HOURS = 1.5

/**
 * Paarse (CONFIRMED) rand: volledig na aanvang tot het laatste deel van het slot; daarna lineair naar 0.
 */
export function computeConfirmedStatusRingOpacity(
  reservationDate: string,
  reservationTime: string,
  durationMinutes: number,
): number {
  const d = new Date()
  const todayLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (reservationDate !== todayLocal) return 1

  const raw = (reservationTime || '12:00').trim().slice(0, 8)
  const m = raw.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return 1
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (!Number.isFinite(h) || !Number.isFinite(min)) return 1
  const start = new Date(`${reservationDate}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`)
  if (Number.isNaN(start.getTime())) return 1
  const dur = Math.max(15, Math.round(durationMinutes || 90))
  const startMs = start.getTime()
  const endMs = startMs + dur * 60 * 1000
  const slotMs = endMs - startMs
  const nowMs = Date.now()
  if (nowMs <= startMs) return 1
  if (nowMs >= endMs) return 0
  const fadeCap = STATUS_RING_FADE_LAST_HOURS * 60 * 60 * 1000
  const fadeMs =
    slotMs >= fadeCap ? fadeCap : Math.max(15 * 60 * 1000, Math.floor(slotMs / 2))
  const toEnd = endMs - nowMs
  if (toEnd >= fadeMs) return 1
  return Math.max(0, toEnd / fadeMs)
}

export interface KassaTable {
  id: string
  number: string
  seats: number
  status: string
}

export interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  isActive: boolean
}

export interface ReservationSettings {
  isEnabled: boolean
  acceptOnline: boolean
  maxPartySize: number
  defaultDurationMinutes: number
  bufferMinutes: number
  slotDurationMinutes: number
  maxReservationsPerSlot: number
  maxCoversPerSlot: number
  minAdvanceHours: number
  maxAdvanceDays: number
  kitchenCapacityEnabled: boolean
  kitchenMaxCoversPer15min: number
  closedDays: number[]
  shifts: Shift[]
  cancellationDeadlineHours: number
  cancellationMessage: string
  reviewLink: string
  autoSendReview: boolean
  depositRequired: boolean
  depositAmount: number
  noShowProtection: boolean
  noShowFee: number
  bookingPageEnabled: boolean
  autoConfirm: boolean
  floorplanFloorOnly: boolean
}

export interface GuestProfile {
  id: string
  name: string
  phone?: string
  email?: string
  isVip: boolean
  isBlocked: boolean
  totalVisits: number
  totalNoShows: number
  totalSpent: number
  lastVisit?: string
  notes?: string
}

export interface FloorPlanTable {
  id: string
  number: string
  seats: number
  shape: 'ROUND' | 'SQUARE' | 'RECTANGLE'
  x: number
  y: number
  rotation: number
  status: string
}

'use client'

import type { ReactNode } from 'react'
import {
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react'
import type { ReservationSettings, ReservationStatus, Shift } from '@/components/kassa-reservations/kassa-reservations-model'

/** Statusbadges — losgetrokken uit KassaReservationsView voor onderhoudbaarheid. */
export const KASSA_STATUS_CONFIG: Record<
  ReservationStatus,
  { label: string; color: string; bgColor: string; icon: ReactNode }
> = {
  PENDING: { label: 'In afwachting', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)', icon: <Clock size={14} /> },
  CONFIRMED: { label: 'Bevestigd', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: <CheckCircle2 size={14} /> },
  CHECKED_IN: { label: 'Ingecheckt', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)', icon: <UserCheck size={14} /> },
  COMPLETED: { label: 'Afgerond', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: <CheckCircle2 size={14} /> },
  NO_SHOW: { label: 'No-show', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: <UserX size={14} /> },
  CANCELLED: { label: 'Geannuleerd', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: <XCircle size={14} /> },
  WAITLIST: { label: 'Wachtlijst', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)', icon: <Clock size={14} /> },
}

export const KASSA_DEFAULT_RESERVATION_SETTINGS: ReservationSettings = {
  isEnabled: true,
  acceptOnline: false,
  maxPartySize: 12,
  defaultDurationMinutes: 90,
  bufferMinutes: 15,
  slotDurationMinutes: 30,
  maxReservationsPerSlot: 0,
  maxCoversPerSlot: 0,
  minAdvanceHours: 2,
  maxAdvanceDays: 60,
  kitchenCapacityEnabled: false,
  kitchenMaxCoversPer15min: 20,
  closedDays: [],
  shifts: [
    { id: '1', name: 'Lunch', startTime: '12:00', endTime: '15:00', isActive: false },
    { id: '2', name: 'Diner', startTime: '18:00', endTime: '23:00', isActive: false },
  ],
  cancellationDeadlineHours: 24,
  cancellationMessage: 'Annulering is niet meer mogelijk, het afgesproken tijdstip is verstreken.',
  reviewLink: '',
  autoSendReview: false,
  depositRequired: false,
  depositAmount: 10,
  noShowProtection: false,
  noShowFee: 25,
  bookingPageEnabled: true,
  autoConfirm: false,
  floorplanFloorOnly: false,
}

function numFromDb(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function boolFromDb(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v
  if (v === 't' || v === 'true' || v === 1) return true
  if (v === 'f' || v === 'false' || v === 0) return false
  return fallback
}

export function mapReservationSettingsFromDb(data: Record<string, unknown>): Partial<ReservationSettings> {
  const D = KASSA_DEFAULT_RESERVATION_SETTINGS
  const safeParseJSON = (val: unknown, fallback: unknown) => {
    if (val == null) return fallback
    if (typeof val !== 'string') return val ?? fallback
    try {
      return JSON.parse(val)
    } catch {
      return fallback
    }
  }
  const closedRaw = safeParseJSON(data.closed_days, D.closedDays)
  const closedDays = Array.isArray(closedRaw)
    ? closedRaw.map((x) => (typeof x === 'number' ? x : Number(x))).filter((x) => Number.isFinite(x))
    : D.closedDays
  const shiftsRaw = safeParseJSON(data.shifts, D.shifts)
  const shifts = Array.isArray(shiftsRaw) ? (shiftsRaw as Shift[]) : D.shifts

  return {
    isEnabled: boolFromDb(data.is_enabled, D.isEnabled),
    acceptOnline: boolFromDb(data.accept_online, D.acceptOnline),
    maxPartySize: numFromDb(data.max_party_size, D.maxPartySize),
    defaultDurationMinutes: numFromDb(data.default_duration_minutes, D.defaultDurationMinutes),
    bufferMinutes: numFromDb(data.buffer_minutes, D.bufferMinutes),
    slotDurationMinutes: numFromDb(data.slot_duration_minutes, D.slotDurationMinutes),
    maxReservationsPerSlot: numFromDb(data.max_reservations_per_slot, D.maxReservationsPerSlot),
    maxCoversPerSlot: numFromDb(data.max_covers_per_slot, D.maxCoversPerSlot),
    minAdvanceHours: numFromDb(data.min_advance_hours, D.minAdvanceHours),
    maxAdvanceDays: numFromDb(data.max_advance_days, D.maxAdvanceDays),
    kitchenCapacityEnabled: boolFromDb(data.kitchen_capacity_enabled, D.kitchenCapacityEnabled),
    kitchenMaxCoversPer15min: numFromDb(data.kitchen_max_covers_per_15min, D.kitchenMaxCoversPer15min),
    closedDays,
    shifts,
    cancellationDeadlineHours: numFromDb(data.cancellation_deadline_hours, D.cancellationDeadlineHours),
    cancellationMessage:
      typeof data.cancellation_message === 'string' ? data.cancellation_message : D.cancellationMessage,
    reviewLink: typeof data.review_link === 'string' ? data.review_link : D.reviewLink,
    autoSendReview: boolFromDb(data.auto_send_review, D.autoSendReview),
    depositRequired: boolFromDb(data.deposit_required, D.depositRequired),
    depositAmount: numFromDb(data.deposit_amount, D.depositAmount),
    noShowProtection: boolFromDb(data.no_show_protection, D.noShowProtection),
    noShowFee: numFromDb(data.no_show_fee, D.noShowFee),
    bookingPageEnabled: boolFromDb(data.booking_page_enabled, D.bookingPageEnabled),
    autoConfirm: boolFromDb(data.auto_confirm, D.autoConfirm),
    floorplanFloorOnly: boolFromDb(data.floorplan_floor_only, D.floorplanFloorOnly),
  }
}

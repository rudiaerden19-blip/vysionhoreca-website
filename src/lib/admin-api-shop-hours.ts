import { supabase } from './supabase'
import { cache, CACHE_TTL, cacheKey } from './cache'
import {
  addDaysToBelgiumYMD,
  getBelgiumDateString,
  getBelgiumTimeHM,
  getBelgiumWeekdayMon0,
} from './belgium-date-bounds'
import { throwIfSupabaseFetchAborted, isPublicDemoTenantSlug } from './admin-api-internal'
import { getExceptionalClosings } from './admin-api-exceptional-closings'
import { adminDb } from './admin-db-client'

// =====================================================
// OPENING HOURS & SHOP STATUS
// =====================================================
export interface OpeningHour {
  id?: string
  tenant_slug: string
  day_of_week: number
  is_open: boolean
  open_time: string
  close_time: string
  last_order_time: string | null
  has_shift2: boolean
  open_time_2: string | null
  close_time_2: string | null
  has_break?: boolean
  break_start?: string | null
  break_end?: string | null
}

export async function getOpeningHours(tenantSlug: string, signal?: AbortSignal): Promise<OpeningHour[]> {
  const fetchHours = async (): Promise<OpeningHour[]> => {
    const base = supabase
      .from('opening_hours')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .order('day_of_week')
    const { data, error } = signal ? await base.abortSignal(signal) : await base

    if (error) {
      throwIfSupabaseFetchAborted(error)
      console.error('Error fetching opening hours:', error)
      return []
    }
    return data || []
  }

  if (isPublicDemoTenantSlug(tenantSlug)) {
    return fetchHours()
  }

  return cache.getOrFetch(cacheKey('opening_hours', tenantSlug), fetchHours, CACHE_TTL.OPENING_HOURS)
}

export async function saveOpeningHours(hours: OpeningHour[]): Promise<boolean> {
  if (hours.length === 0) return true
  /** PHASE 1: server-side via /api/admin/db. */
  const r = await adminDb.upsert(
    'opening_hours',
    hours as unknown as Record<string, unknown>[],
    { tenantSlug: hours[0].tenant_slug, onConflict: 'tenant_slug,day_of_week'},
  )
  if (!r.ok) {
    console.error('Error saving opening hours:', r.error)
    return false
  }
  cache.invalidate(cacheKey('opening_hours', hours[0].tenant_slug))
  return true
}

export interface ShopStatus {
  isOpen: boolean
  canOrder: boolean
  message: string
  orderCutoffMessage?: string
  opensAt?: string
  closesAt?: string
  nextOpenDay?: string
}

function formatTimeShort(time: string): string {
  if (!time) return ''
  return time.slice(0, 5)
}

function subtractMinutes(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, mins, 0, 0)
  date.setMinutes(date.getMinutes() - minutes)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function toMinutes(time: string): number {
  const [h, m] = formatTimeShort(time || '00:00').split(':').map(Number)
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}

/** Sluiting 01:00 bij opening 17:00 = over middernacht. */
function isOvernightRange(open: string, close: string): boolean {
  return toMinutes(close) <= toMinutes(open)
}

function isInOpenWindow(now: string, open: string, close: string): boolean {
  const n = toMinutes(now)
  const o = toMinutes(open)
  const c = toMinutes(close)
  if (c <= o) return n >= o || n < c
  return n >= o && n < c
}

function minutesSinceOpen(now: string, open: string): number {
  const n = toMinutes(now)
  const o = toMinutes(open)
  return n >= o ? n - o : n + 24 * 60 - o
}

function resolveLastOrderTime(hours: OpeningHour, closeTime: string): string {
  const lot = hours.last_order_time
  if (!lot) return closeTime
  if (lot === '15min') return subtractMinutes(closeTime, 15)
  if (lot === '30min') return subtractMinutes(closeTime, 30)
  if (lot === '45min') return subtractMinutes(closeTime, 45)
  if (lot === '60min') return subtractMinutes(closeTime, 60)
  if (lot.includes(':')) return lot
  return closeTime
}

function leftoverFromPreviousDay(
  hours: OpeningHour | undefined,
  now: string,
): { hours: OpeningHour; open: string; close: string } | null {
  if (!hours?.is_open) return null
  if (isOvernightRange(hours.open_time, hours.close_time) && toMinutes(now) < toMinutes(hours.close_time)) {
    return { hours, open: hours.open_time, close: hours.close_time }
  }
  if (
    hours.has_shift2 &&
    hours.open_time_2 &&
    hours.close_time_2 &&
    isOvernightRange(hours.open_time_2, hours.close_time_2) &&
    toMinutes(now) < toMinutes(hours.close_time_2)
  ) {
    return { hours, open: hours.open_time_2, close: hours.close_time_2 }
  }
  return null
}

function openStatusForWindow(
  hours: OpeningHour,
  now: string,
  open: string,
  close: string,
  nextOpenHint?: { dayLabel: string; openTime: string },
): ShopStatus {
  const lastOrder = resolveLastOrderTime(hours, close)
  const pastLastOrder = minutesSinceOpen(now, open) >= minutesSinceOpen(lastOrder, open)
  if (pastLastOrder && isInOpenWindow(now, open, close)) {
    return {
      isOpen: true,
      canOrder: false,
      message: `Open tot ${formatTimeShort(close)}`,
      orderCutoffMessage: nextOpenHint
        ? `Bestellen is niet meer mogelijk voor vandaag. Bestel voor ${nextOpenHint.dayLabel}!`
        : `Bestellen is niet meer mogelijk voor vandaag.`,
      closesAt: formatTimeShort(close),
      ...(nextOpenHint
        ? { nextOpenDay: nextOpenHint.dayLabel, opensAt: formatTimeShort(nextOpenHint.openTime) }
        : {}),
    }
  }
  return {
    isOpen: true,
    canOrder: true,
    message: `Open tot ${formatTimeShort(close)}`,
    closesAt: formatTimeShort(close),
  }
}

export async function getShopStatus(tenantSlug: string, signal?: AbortSignal): Promise<ShopStatus> {
  const [hours, exceptionalClosings] = await Promise.all([
    getOpeningHours(tenantSlug, signal),
    getExceptionalClosings(tenantSlug, signal),
  ])

  const todayStr = getBelgiumDateString()
  const exceptionalToday = exceptionalClosings.find((c) => {
    if (c.date === todayStr) return true
    if (c.date_end) return todayStr >= c.date && todayStr <= c.date_end
    return false
  })
  if (exceptionalToday) {
    const reason = exceptionalToday.reason || 'Gesloten'
    const dayOfWeek = getBelgiumWeekdayMon0()
    const dayNames = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
    for (let i = 1; i <= 14; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextDateStr = addDaysToBelgiumYMD(todayStr, i)
      const isExceptional = exceptionalClosings.some((c) => {
        if (c.date === nextDateStr) return true
        if (c.date_end) return nextDateStr >= c.date && nextDateStr <= c.date_end
        return false
      })
      if (!isExceptional) {
        const nextHours = hours?.find((h) => h.day_of_week === nextDay)
        if (nextHours?.is_open) {
          const dayLabel = i === 1 ? 'morgen': dayNames[nextDay]
          return {
            isOpen: false,
            canOrder: false,
            message: `${reason} — Weer open ${dayLabel} om ${formatTimeShort(nextHours.open_time)}`,
            nextOpenDay: dayLabel,
            opensAt: formatTimeShort(nextHours.open_time),
          }
        }
      }
    }
    return { isOpen: false, canOrder: false, message: reason }
  }

  if (!hours || hours.length === 0) {
    return { isOpen: true, canOrder: true, message: 'Open'}
  }

  const currentTimeStr = getBelgiumTimeHM()
  const dayOfWeek = getBelgiumWeekdayMon0()
  const dayNames = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']

  const yesterdayHours = hours.find((h) => h.day_of_week === (dayOfWeek + 6) % 7)
  const leftover = leftoverFromPreviousDay(yesterdayHours, currentTimeStr)
  if (leftover) {
    return openStatusForWindow(leftover.hours, currentTimeStr, leftover.open, leftover.close)
  }

  const todayHours = hours.find((h) => h.day_of_week === dayOfWeek)

  if (!todayHours || !todayHours.is_open) {
    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextDayHours = hours.find((h) => h.day_of_week === nextDay)
      if (nextDayHours && nextDayHours.is_open) {
        return {
          isOpen: false,
          canOrder: false,
          message: `Gesloten - Weer open ${dayNames[nextDay]} om ${formatTimeShort(nextDayHours.open_time)}`,
          nextOpenDay: dayNames[nextDay],
          opensAt: formatTimeShort(nextDayHours.open_time),
        }
      }
    }
    return { isOpen: false, canOrder: false, message: 'Momenteel gesloten'}
  }

  const openTime = todayHours.open_time
  const closeTime = todayHours.close_time

  if (currentTimeStr < openTime && !isOvernightRange(openTime, closeTime)) {
    return {
      isOpen: false,
      canOrder: false,
      message: `Gesloten - We openen vandaag om ${formatTimeShort(openTime)}`,
      opensAt: formatTimeShort(openTime),
    }
  }

  if (currentTimeStr < openTime && isOvernightRange(openTime, closeTime) && !isInOpenWindow(currentTimeStr, openTime, closeTime)) {
    return {
      isOpen: false,
      canOrder: false,
      message: `Gesloten - We openen vandaag om ${formatTimeShort(openTime)}`,
      opensAt: formatTimeShort(openTime),
    }
  }

  if (!isInOpenWindow(currentTimeStr, openTime, closeTime)) {
    if (todayHours.has_shift2 && todayHours.open_time_2 && todayHours.close_time_2) {
      const openTime2 = todayHours.open_time_2
      const closeTime2 = todayHours.close_time_2

      if (isInOpenWindow(currentTimeStr, openTime2, closeTime2)) {
        return openStatusForWindow(todayHours, currentTimeStr, openTime2, closeTime2)
      }

      if (currentTimeStr < openTime2 || (isOvernightRange(openTime2, closeTime2) && currentTimeStr >= closeTime2 && currentTimeStr < openTime2)) {
        return {
          isOpen: false,
          canOrder: false,
          message: `Pauze - We zijn weer open om ${formatTimeShort(openTime2)}`,
          opensAt: formatTimeShort(openTime2),
        }
      }
    }

    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextDayHours = hours.find((h) => h.day_of_week === nextDay)
      if (nextDayHours && nextDayHours.is_open) {
        const dayLabel = i === 1 ? 'morgen': dayNames[nextDay]
        return {
          isOpen: false,
          canOrder: false,
          message: `Gesloten - Weer open ${dayLabel} om ${formatTimeShort(nextDayHours.open_time)}`,
          nextOpenDay: dayLabel,
          opensAt: formatTimeShort(nextDayHours.open_time),
        }
      }
    }
    return { isOpen: false, canOrder: false, message: 'Momenteel gesloten'}
  }

  if (todayHours.has_break && todayHours.break_start && todayHours.break_end) {
    if (currentTimeStr >= todayHours.break_start && currentTimeStr < todayHours.break_end) {
      return {
        isOpen: false,
        canOrder: false,
        message: `Pauze - We zijn weer open om ${formatTimeShort(todayHours.break_end)}`,
        opensAt: formatTimeShort(todayHours.break_end),
      }
    }
  }

  let nextOpenHint: { dayLabel: string; openTime: string } | undefined
  for (let i = 1; i <= 7; i++) {
    const nextDay = (dayOfWeek + i) % 7
    const nextDayHours = hours.find((h) => h.day_of_week === nextDay)
    if (nextDayHours && nextDayHours.is_open) {
      nextOpenHint = { dayLabel: i === 1 ? 'morgen' : dayNames[nextDay], openTime: nextDayHours.open_time }
      break
    }
  }

  return openStatusForWindow(todayHours, currentTimeStr, openTime, closeTime, nextOpenHint)
}

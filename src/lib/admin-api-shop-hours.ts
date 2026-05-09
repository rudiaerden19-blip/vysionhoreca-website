import { supabase } from './supabase'
import { cache, CACHE_TTL, cacheKey } from './cache'
import {
  addDaysToBelgiumYMD,
  getBelgiumDateString,
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
    { tenantSlug: hours[0].tenant_slug, onConflict: 'tenant_slug,day_of_week' },
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
    const now = new Date()
    const jsDay = now.getDay()
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1
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
          const dayLabel = i === 1 ? 'morgen' : dayNames[nextDay]
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
    return { isOpen: true, canOrder: true, message: 'Open' }
  }

  const now = new Date()
  const jsDay = now.getDay()
  const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1

  const currentTimeStr = now.toTimeString().slice(0, 5)

  const todayHours = hours.find((h) => h.day_of_week === dayOfWeek)

  const dayNames = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']

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
    return { isOpen: false, canOrder: false, message: 'Momenteel gesloten' }
  }

  const openTime = todayHours.open_time
  const closeTime = todayHours.close_time

  if (currentTimeStr < openTime) {
    return {
      isOpen: false,
      canOrder: false,
      message: `Gesloten - We openen vandaag om ${formatTimeShort(openTime)}`,
      opensAt: formatTimeShort(openTime),
    }
  }

  if (currentTimeStr >= closeTime) {
    if (todayHours.has_shift2 && todayHours.open_time_2 && todayHours.close_time_2) {
      const openTime2 = todayHours.open_time_2
      const closeTime2 = todayHours.close_time_2

      if (currentTimeStr < openTime2) {
        return {
          isOpen: false,
          canOrder: false,
          message: `Pauze - We zijn weer open om ${formatTimeShort(openTime2)}`,
          opensAt: formatTimeShort(openTime2),
        }
      }

      if (currentTimeStr >= openTime2 && currentTimeStr < closeTime2) {
        let lastOrderTime2 = closeTime2
        if (todayHours.last_order_time) {
          if (todayHours.last_order_time === '15min') lastOrderTime2 = subtractMinutes(closeTime2, 15)
          else if (todayHours.last_order_time === '30min') lastOrderTime2 = subtractMinutes(closeTime2, 30)
          else if (todayHours.last_order_time === '45min') lastOrderTime2 = subtractMinutes(closeTime2, 45)
          else if (todayHours.last_order_time === '60min') lastOrderTime2 = subtractMinutes(closeTime2, 60)
          else if (todayHours.last_order_time.includes(':')) lastOrderTime2 = todayHours.last_order_time
        }
        if (currentTimeStr >= lastOrderTime2) {
          return {
            isOpen: true,
            canOrder: false,
            message: `Open tot ${formatTimeShort(closeTime2)}`,
            orderCutoffMessage: `Bestellen is niet meer mogelijk voor vandaag.`,
            closesAt: formatTimeShort(closeTime2),
          }
        }
        return {
          isOpen: true,
          canOrder: true,
          message: `Open tot ${formatTimeShort(closeTime2)}`,
          closesAt: formatTimeShort(closeTime2),
        }
      }
    }

    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextDayHours = hours.find((h) => h.day_of_week === nextDay)
      if (nextDayHours && nextDayHours.is_open) {
        const dayLabel = i === 1 ? 'morgen' : dayNames[nextDay]
        return {
          isOpen: false,
          canOrder: false,
          message: `Gesloten - Weer open ${dayLabel} om ${formatTimeShort(nextDayHours.open_time)}`,
          nextOpenDay: dayLabel,
          opensAt: formatTimeShort(nextDayHours.open_time),
        }
      }
    }
    return { isOpen: false, canOrder: false, message: 'Momenteel gesloten' }
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

  let lastOrderTime = closeTime
  if (todayHours.last_order_time) {
    if (todayHours.last_order_time === '15min') {
      lastOrderTime = subtractMinutes(closeTime, 15)
    } else if (todayHours.last_order_time === '30min') {
      lastOrderTime = subtractMinutes(closeTime, 30)
    } else if (todayHours.last_order_time === '45min') {
      lastOrderTime = subtractMinutes(closeTime, 45)
    } else if (todayHours.last_order_time === '60min') {
      lastOrderTime = subtractMinutes(closeTime, 60)
    } else if (todayHours.last_order_time.includes(':')) {
      lastOrderTime = todayHours.last_order_time
    }
  }

  if (currentTimeStr >= lastOrderTime && currentTimeStr < closeTime) {
    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextDayHours = hours.find((h) => h.day_of_week === nextDay)
      if (nextDayHours && nextDayHours.is_open) {
        const dayLabel = i === 1 ? 'morgen' : dayNames[nextDay]
        return {
          isOpen: true,
          canOrder: false,
          message: `Open tot ${formatTimeShort(closeTime)}`,
          orderCutoffMessage: `Bestellen is niet meer mogelijk voor vandaag. Bestel voor ${dayLabel}!`,
          closesAt: formatTimeShort(closeTime),
          nextOpenDay: dayLabel,
          opensAt: formatTimeShort(nextDayHours.open_time),
        }
      }
    }
    return {
      isOpen: true,
      canOrder: false,
      message: `Open tot ${formatTimeShort(closeTime)}`,
      orderCutoffMessage: `Bestellen is niet meer mogelijk voor vandaag.`,
      closesAt: formatTimeShort(closeTime),
    }
  }

  return {
    isOpen: true,
    canOrder: true,
    message: `Open tot ${formatTimeShort(closeTime)}`,
    closesAt: formatTimeShort(closeTime),
  }
}

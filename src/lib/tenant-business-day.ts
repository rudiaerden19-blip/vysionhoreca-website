/**
 * Werkdag per tenant: openingsuren, niet een vaste 12u-grens.
 * Open 08:00–01:00 → die dag telt tot 01:00; daarna begint de volgende dag.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  addDaysToBelgiumYMD,
  belgiumLocalToUtcIso,
  getBelgiumDateString,
  getBelgiumTimeHM,
  getBelgiumWeekdayMon0,
} from './belgium-date-bounds'
import { formatTimeShort, isOvernightRange, toMinutes } from './opening-hours-window'

export type TenantHourRow = {
  day_of_week: number
  is_open: boolean
  open_time: string
  close_time: string
  has_shift2?: boolean
  open_time_2?: string | null
  close_time_2?: string | null
}

export async function fetchOpeningHoursForTenant(
  client: SupabaseClient,
  tenantSlug: string,
): Promise<TenantHourRow[]> {
  const { data, error } = await client
    .from('opening_hours')
    .select('day_of_week, is_open, open_time, close_time, has_shift2, open_time_2, close_time_2')
    .eq('tenant_slug', tenantSlug)
    .order('day_of_week')
  if (error) {
    console.error('fetchOpeningHoursForTenant:', error.message)
    return []
  }
  return (data || []) as TenantHourRow[]
}

function hoursForYmd(ymd: string, hours: TenantHourRow[]): TenantHourRow | undefined {
  const [y, m, d] = ymd.split('-').map(Number)
  const dow = getBelgiumWeekdayMon0(new Date(Date.UTC(y, m - 1, d, 12, 0, 0)))
  return hours.find((h) => h.day_of_week === dow)
}

/** Sluiting over middernacht van die weekdag, anders null. */
export function overnightServiceClose(hours?: TenantHourRow): string | null {
  if (!hours?.is_open) return null
  if (hours.open_time && hours.close_time && isOvernightRange(hours.open_time, hours.close_time)) {
    return formatTimeShort(hours.close_time)
  }
  if (
    hours.has_shift2 &&
    hours.open_time_2 &&
    hours.close_time_2 &&
    isOvernightRange(hours.open_time_2, hours.close_time_2)
  ) {
    return formatTimeShort(hours.close_time_2)
  }
  return null
}

export function businessDayForOrder(createdAt: string, hours: TenantHourRow[]): string | null {
  const t = new Date(createdAt)
  if (Number.isNaN(t.getTime())) return null
  const ymd = getBelgiumDateString(t)
  if (!hours.length) return ymd

  const hm = getBelgiumTimeHM(t)
  const prev = addDaysToBelgiumYMD(ymd, -1)
  const close = overnightServiceClose(hoursForYmd(prev, hours))
  if (close && toMinutes(hm) < toMinutes(close)) return prev
  return ymd
}

export function getCurrentBusinessDay(now = new Date(), hours: TenantHourRow[] = []): string {
  return businessDayForOrder(now.toISOString(), hours) ?? getBelgiumDateString(now)
}

export function getTenantBusinessDayBounds(
  dateStr: string,
  hours: TenantHourRow[],
): { startUTC: string; endUTC: string } {
  const prev = addDaysToBelgiumYMD(dateStr, -1)
  const next = addDaysToBelgiumYMD(dateStr, 1)
  const prevClose = hours.length ? overnightServiceClose(hoursForYmd(prev, hours)) : null
  const dayClose = hours.length ? overnightServiceClose(hoursForYmd(dateStr, hours)) : null

  const startUTC = prevClose
    ? belgiumLocalToUtcIso(dateStr, prevClose)
    : belgiumLocalToUtcIso(dateStr, '00:00')
  const endUTC = dayClose
    ? belgiumLocalToUtcIso(next, dayClose)
    : belgiumLocalToUtcIso(next, '00:00')

  return { startUTC, endUTC }
}

export function formatTenantBusinessDayPeriod(dateStr: string, hours: TenantHourRow[]): string {
  const dayH = hoursForYmd(dateStr, hours)
  if (!dayH?.is_open) return 'volgens openingsuren'
  const open = formatTimeShort(dayH.open_time)
  const night = overnightServiceClose(dayH)
  if (night) return `${open} – +1dag ${night}`
  const close = formatTimeShort(dayH.close_time)
  const close2 = dayH.has_shift2 && dayH.close_time_2 ? ` / ${formatTimeShort(dayH.close_time_2)}` : ''
  return `${open} – ${close}${close2}`
}

export function lastCompletedBusinessDay(now = new Date(), hours: TenantHourRow[] = []): string {
  const ymd = getBelgiumDateString(now)
  if (!hours.length) return addDaysToBelgiumYMD(ymd, -1)

  for (let i = 0; i < 14; i++) {
    const d = addDaysToBelgiumYMD(ymd, -i)
    const { endUTC } = getTenantBusinessDayBounds(d, hours)
    if (now.getTime() >= new Date(endUTC).getTime()) return d
  }
  return addDaysToBelgiumYMD(ymd, -1)
}

export function listBusinessDaysEndingAt(endYmd: string, count: number): string[] {
  const out: string[] = []
  let d = endYmd
  for (let i = 0; i < count; i++) {
    out.unshift(d)
    d = addDaysToBelgiumYMD(d, -1)
  }
  return out
}

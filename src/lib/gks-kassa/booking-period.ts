import { getBelgiumDateString } from '@/lib/belgium-date-bounds'

const KEY = (tenant: string, date: string) => `gks_booking_period_${tenant}_${date}`

export function getBookingDateBrussels(): string {
  return getBelgiumDateString(new Date())
}

export function getOrCreateBookingPeriodId(tenantSlug: string): string {
  const bookingDate = getBookingDateBrussels()
  if (typeof window === 'undefined') return `bp-${tenantSlug}-${bookingDate}`
  try {
    const k = KEY(tenantSlug, bookingDate)
    const existing = sessionStorage.getItem(k)?.trim()
    if (existing) return existing
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `bp-${Date.now()}`
    sessionStorage.setItem(k, id)
    return id
  } catch {
    return `bp-fallback-${bookingDate}`
  }
}

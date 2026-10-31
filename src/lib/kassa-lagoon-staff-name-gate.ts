import { addDaysToBelgiumYMD, getBelgiumDateString, getBelgiumTimeHM } from '@/lib/belgium-date-bounds'
import { isTheLagoonTenant } from '@/lib/lagoon-kitchen-screen'

/**
 * Eén avond loopt tot 12:00 de volgende dag.
 * Een shift van 21:00 tot na middernacht blijft daardoor dezelfde avond.
 */
export function lagoonKassaEveningId(now: Date = new Date()): string {
  const ymd = getBelgiumDateString(now)
  const hour = Number(getBelgiumTimeHM(now).slice(0, 2))
  if (Number.isFinite(hour) && hour < 12) return addDaysToBelgiumYMD(ymd, -1)
  return ymd
}

type StoredPick = { eveningId: string; staffId: string }

function storageKey(tenant: string): string {
  return `vysion-lagoon-staff-evening:${String(tenant ?? '').trim().toLowerCase()}`
}

export function readLagoonEveningStaffPick(tenant: string, now: Date = new Date()): StoredPick | null {
  if (!isTheLagoonTenant(tenant) || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(tenant))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPick
    const eveningId = String(parsed?.eveningId ?? '')
    const staffId = String(parsed?.staffId ?? '').trim()
    if (!eveningId || !staffId) return null
    if (eveningId !== lagoonKassaEveningId(now)) return null
    return { eveningId, staffId }
  } catch {
    return null
  }
}

export function writeLagoonEveningStaffPick(tenant: string, staffId: string, now: Date = new Date()): void {
  if (!isTheLagoonTenant(tenant) || typeof localStorage === 'undefined') return
  const id = String(staffId ?? '').trim()
  if (!id) return
  const pick: StoredPick = { eveningId: lagoonKassaEveningId(now), staffId: id }
  localStorage.setItem(storageKey(tenant), JSON.stringify(pick))
}

/** True als The Lagoon deze avond al een ingeklokte naam gekozen heeft. */
export function lagoonEveningPickIsCurrent(
  tenant: string,
  activeStaffId: string | null | undefined,
  clockedInIds: string[],
  now: Date = new Date(),
): boolean {
  if (!isTheLagoonTenant(tenant)) return true
  const pick = readLagoonEveningStaffPick(tenant, now)
  const active = String(activeStaffId ?? '').trim()
  if (!pick || !active || pick.staffId !== active) return false
  return clockedInIds.includes(active)
}

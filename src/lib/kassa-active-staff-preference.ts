/** Gekozen kassa-medewerker (personeelsklok) — blijft staan tot andere keuze of uitklokken. */

export type StoredKassaActiveStaff = { id: string; name: string }

export function kassaActiveStaffStorageKey(tenantSlug: string): string {
  return `vysion_kassa_active_staff_${tenantSlug}`
}

export function readKassaActiveStaffPreference(tenantSlug: string): StoredKassaActiveStaff | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(kassaActiveStaffStorageKey(tenantSlug))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { id?: string; name?: string }
    const id = parsed.id?.trim()
    const name = parsed.name?.trim()
    if (!id || !name) return null
    return { id, name }
  } catch {
    return null
  }
}

export function writeKassaActiveStaffPreference(
  tenantSlug: string,
  staff: StoredKassaActiveStaff | null,
): void {
  if (typeof window === 'undefined') return
  const key = kassaActiveStaffStorageKey(tenantSlug)
  try {
    if (!staff) {
      window.localStorage.removeItem(key)
      return
    }
    window.localStorage.setItem(key, JSON.stringify({ id: staff.id, name: staff.name }))
  } catch {
    /* quota / private mode */
  }
}

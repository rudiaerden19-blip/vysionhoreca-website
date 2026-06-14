/** Gekozen kassa-medewerker — Supabase `kassa_pos_state` (geen localStorage). */

import { fetchKassaPosState, patchKassaPosState } from '@/lib/kassa-pos-state-client'

export type StoredKassaActiveStaff = { id: string; name: string }

/** @deprecated Geen localStorage meer — gebruik `loadKassaActiveStaffFromServer`. */
export function kassaActiveStaffStorageKey(_tenantSlug: string): string {
  return ''
}

/** @deprecated Altijd null — bron is Supabase. */
export function readKassaActiveStaffPreference(_tenantSlug: string): StoredKassaActiveStaff | null {
  return null
}

/** @deprecated No-op — gebruik `persistKassaActiveStaffToServer`. */
export function writeKassaActiveStaffPreference(_tenantSlug: string, _staff: StoredKassaActiveStaff | null): void {
  /* intentionally empty */
}

export async function loadKassaActiveStaffFromServer(
  tenantSlug: string,
): Promise<StoredKassaActiveStaff | null> {
  const state = await fetchKassaPosState(tenantSlug)
  const id = state.active_staff_id?.trim()
  const name = state.active_staff_name?.trim()
  if (!id || !name) return null
  return { id, name }
}

export async function persistKassaActiveStaffToServer(
  tenantSlug: string,
  staff: StoredKassaActiveStaff | null,
): Promise<void> {
  await patchKassaPosState(tenantSlug, {
    active_staff_id: staff?.id ?? null,
    active_staff_name: staff?.name ?? null,
  })
}

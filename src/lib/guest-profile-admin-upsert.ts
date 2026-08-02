'use client'

import { adminDb } from '@/lib/admin-db-client'

export type GuestProfileUpsertPayload = {
  tenant_slug: string
  name: string
  phone?: string | null
  email?: string | null
  is_vip?: boolean
  is_blocked?: boolean
  total_no_shows?: number
  notes?: string
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Upsert guest_profiles — zelfde conflict-keys als /api/public/guest-profile. */
export async function upsertGuestProfileForTenant(
  tenantSlug: string,
  payload: GuestProfileUpsertPayload,
  existingId?: string | null,
) {
  const phone = payload.phone?.trim() || null
  const email = payload.email?.trim() || null
  const row = { ...payload, phone, email }

  if (phone) {
    return adminDb.upsert('guest_profiles', row, {
      tenantSlug,
      onConflict: 'tenant_slug,phone',
    })
  }
  if (email) {
    return adminDb.upsert('guest_profiles', row, {
      tenantSlug,
      onConflict: 'tenant_slug,email',
    })
  }

  const id = existingId && UUID_RE.test(existingId) ? existingId : null
  if (id) {
    const { tenant_slug: _t, ...data } = row
    return adminDb.update(
      'guest_profiles',
      data,
      { id, tenant_slug: tenantSlug },
      { tenantSlug },
    )
  }

  return adminDb.insert('guest_profiles', row, { tenantSlug })
}

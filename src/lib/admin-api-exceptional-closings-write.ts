'use client'

import { adminDb } from './admin-db-client'
import type { ExceptionalClosing } from './admin-api-exceptional-closings'

export async function saveExceptionalClosing(
  closing: ExceptionalClosing,
): Promise<{ ok: true; row: ExceptionalClosing } | { ok: false; error: string }> {
  const payload: Record<string, unknown> = {
    tenant_slug: closing.tenant_slug,
    date: closing.date,
    reason: closing.reason,
    is_holiday: closing.is_holiday,
    holiday_key: closing.holiday_key ?? null,
  }
  if (closing.date_end) payload.date_end = closing.date_end

  const r = await adminDb.upsert('exceptional_closings', payload, {
    tenantSlug: closing.tenant_slug,
    onConflict: 'tenant_slug,date',
  })

  if (!r.ok) {
    console.error('Error saving exceptional closing:', r.error)
    return { ok: false, error: r.error || 'Onbekende fout' }
  }
  const raw = Array.isArray(r.data) ? r.data[0] : r.data
  if (!raw) {
    return { ok: true, row: { ...closing } }
  }
  return { ok: true, row: raw as ExceptionalClosing }
}

export async function deleteExceptionalClosing(tenantSlug: string, date: string): Promise<boolean> {
  const r = await adminDb.delete('exceptional_closings', {
    tenant_slug: tenantSlug,
    date,
  })

  if (!r.ok) {
    console.error('Error deleting exceptional closing:', r.error)
    return false
  }
  return true
}

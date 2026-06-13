/** Shared guards for kassa Supabase errors (offline queue, retries). */

export function isLikelyOfflineOrNetworkSupabaseError(error: { message?: string } | null | undefined): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const m = (error?.message || '').toLowerCase()
  return (
    m.includes('fetch') ||
    m.includes('network') ||
    m.includes('failed to fetch') ||
    m.includes('load failed')
  )
}

/** Postgres unique violation on kassa_client_uuid → order already exists (retry after offline sync). */
export function isDuplicateKassaClientUuidError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error || error.code !== '23505') return false
  const msg = (error.message || '').toLowerCase()
  return msg.includes('kassa_client') || msg.includes('idx_orders_tenant_kassa')
}

/** Zelfde constraint gedetecteerd vanuit PostgREST-object óf `/api/admin/db`-foutstring. */
export function isDuplicateKassaClientViolation(raw: unknown): boolean {
  if (raw && typeof raw === 'object' && 'code'in (raw as object)) {
    return isDuplicateKassaClientUuidError(raw as { code?: string; message?: string })
  }
  const msg = String(raw ?? '').toLowerCase()
  if (!msg.includes('duplicate')) return false
  return (
    msg.includes('23505') ||
    msg.includes('kassa_client') ||
    msg.includes('idx_orders_tenant_kassa')
  )
}

/** Offline / timeout / netwerk — bruikbaar voor admin-proxy `{ error: string }`en Supabase-foutobjecten. */
export function isLikelyOfflineOrNetworkPersistFailure(raw: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  if (raw && typeof raw === 'object' && 'message'in (raw as object)) {
    return isLikelyOfflineOrNetworkSupabaseError(raw as { message?: string })
  }
  const m = String(raw ?? '').toLowerCase()
  return (
    m.includes('fetch') ||
    m.includes('network') ||
    m.includes('failed to fetch') ||
    m.includes('load failed') ||
    m.includes('timeout') ||
    m.includes('abort')
  )
}

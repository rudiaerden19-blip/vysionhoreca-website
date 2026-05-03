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

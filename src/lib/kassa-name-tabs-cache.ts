import { adminDb } from '@/lib/admin-db-client'
import type { KassaNameTabRow } from '@/lib/kassa-name-account'

type CacheEntry = {
  tabs: KassaNameTabRow[]
  fetchedAt: number
}

const byTenant = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<KassaNameTabRow[]>>()

const STALE_MS = 45_000

export function getCachedKassaNameTabs(tenant: string): KassaNameTabRow[] | null {
  const hit = byTenant.get(tenant)
  if (!hit) return null
  return hit.tabs
}

export function setCachedKassaNameTabs(tenant: string, tabs: KassaNameTabRow[]): void {
  byTenant.set(tenant, { tabs, fetchedAt: Date.now() })
}

export function invalidateKassaNameTabsCache(tenant: string): void {
  byTenant.delete(tenant)
}

/** Laad tabs; hergebruik cache + dedupe parallelle requests. */
export async function fetchKassaNameTabs(
  tenant: string,
  opts?: { force?: boolean },
): Promise<{ ok: boolean; tabs: KassaNameTabRow[]; fromCache: boolean; error?: string }> {
  const cached = byTenant.get(tenant)
  const fresh = cached && Date.now() - cached.fetchedAt < STALE_MS
  if (!opts?.force && fresh) {
    return { ok: true, tabs: cached.tabs, fromCache: true }
  }

  const pending = inflight.get(tenant)
  if (pending) {
    const tabs = await pending
    return { ok: true, tabs, fromCache: false }
  }

  const promise = (async () => {
    const res = await adminDb.select<KassaNameTabRow[]>('kassa_name_tabs', {
      tenantSlug: tenant,
      match: { tenant_slug: tenant },
      select: 'id,tenant_slug,customer_name,customer_key,items,order_type,table_number,floor_plan_zone,updated_at',
      limit: 200,
    })
    if (!res.ok) {
      throw new Error(res.error || 'load_failed')
    }
    const tabs = Array.isArray(res.data) ? res.data : []
    setCachedKassaNameTabs(tenant, tabs)
    return tabs
  })()

  inflight.set(tenant, promise)
  try {
    const tabs = await promise
    return { ok: true, tabs, fromCache: false }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (cached) {
      return { ok: true, tabs: cached.tabs, fromCache: true, error: msg }
    }
    return { ok: false, tabs: [], fromCache: false, error: msg }
  } finally {
    inflight.delete(tenant)
  }
}

export function prefetchKassaNameTabs(tenant: string): void {
  void fetchKassaNameTabs(tenant)
}

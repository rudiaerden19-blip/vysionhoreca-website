import { adminDb } from '@/lib/admin-db-client'
import type { KassaNameTabRow } from '@/lib/kassa-name-account'
import { filterKassaNameTabsForTenant } from '@/lib/kassa-name-account-guard'

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

async function loadTabsFromDb(tenant: string): Promise<KassaNameTabRow[]> {
  const res = await adminDb.select<KassaNameTabRow[]>('kassa_name_tabs', {
    tenantSlug: tenant,
    match: { tenant_slug: tenant },
    limit: 200,
  })
  if (!res.ok) {
    throw new Error(res.error || 'load_failed')
  }
  const rows = Array.isArray(res.data) ? res.data : []
  return filterKassaNameTabsForTenant(rows, tenant)
}

function failResult(
  cached: CacheEntry | undefined,
  msg: string,
): { ok: boolean; tabs: KassaNameTabRow[]; fromCache: boolean; error?: string } {
  if (cached) {
    return { ok: true, tabs: cached.tabs, fromCache: true, error: msg }
  }
  return { ok: false, tabs: [], fromCache: false, error: msg }
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
    try {
      const tabs = await pending
      return { ok: true, tabs, fromCache: false }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return failResult(cached, msg)
    }
  }

  const promise = loadTabsFromDb(tenant).then((tabs) => {
    setCachedKassaNameTabs(tenant, tabs)
    return tabs
  })

  inflight.set(tenant, promise)
  try {
    const tabs = await promise
    return { ok: true, tabs, fromCache: false }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return failResult(cached, msg)
  } finally {
    inflight.delete(tenant)
  }
}

export function prefetchKassaNameTabs(tenant: string): void {
  void fetchKassaNameTabs(tenant).catch(() => {
    /* UI toont fout via expliciete load */
  })
}

/**
 * Merge IndexedDB + localStorage offline order queues and flush to Supabase (Web Locks).
 */

import { syncZReportAfterOrder } from '@/lib/admin-api'
import {
  offlineDbGetOrderQueue,
  offlineDbSetOrderQueue,
} from '@/lib/kassa-offline-db'
import { isDuplicateKassaClientUuidError } from '@/lib/kassa-supabase-guards'
import { supabase } from '@/lib/supabase'

export function offlineOrdersQueueStorageKey(tenantSlug: string): string {
  return `vysion_offline_orders_${tenantSlug}`
}

export async function mergeOfflineOrderQueues(tenantSlug: string): Promise<object[]> {
  const offlineQueueKey = offlineOrdersQueueStorageKey(tenantSlug)
  let fromIdb: object[] = []
  try {
    fromIdb = await offlineDbGetOrderQueue(tenantSlug)
  } catch {
    fromIdb = []
  }
  let fromLs: object[] = []
  const raw = localStorage.getItem(offlineQueueKey)
  if (raw) {
    try {
      fromLs = JSON.parse(raw)
    } catch {
      fromLs = []
    }
  }
  const byUuid = new Map<string, object>()
  const legacyNum = new Map<number, object>()
  for (const o of [...fromLs, ...fromIdb]) {
    const row = o as { kassa_client_uuid?: string; order_number?: number }
    const u = row.kassa_client_uuid
    if (typeof u === 'string' && u.length > 0) {
      byUuid.set(u, o)
    } else if (typeof row.order_number === 'number') {
      legacyNum.set(row.order_number, o)
    } else {
      const fallbackKey = `legacy:${String((row as { created_at?: string }).created_at ?? '')}:${String((row as { total?: number }).total ?? '')}`
      byUuid.set(fallbackKey, o)
    }
  }
  const merged = [...byUuid.values(), ...legacyNum.values()]
  if (merged.length > 0) {
    try {
      await offlineDbSetOrderQueue(tenantSlug, merged)
      localStorage.setItem(offlineQueueKey, JSON.stringify(merged))
    } catch {
      /* ignore */
    }
  }
  return merged
}

export async function flushOfflineOrdersToSupabase(tenantSlug: string): Promise<void> {
  const offlineQueueKey = offlineOrdersQueueStorageKey(tenantSlug)

  const processQueue = async () => {
    const freshQueue = await mergeOfflineOrderQueues(tenantSlug)
    if (freshQueue.length === 0) return

    const remaining: object[] = []
    for (const order of freshQueue) {
      const { error } = await supabase.from('orders').insert(order)
      if (!error) {
        const o = order as { tenant_slug?: string; created_at?: string }
        if (o.tenant_slug && o.created_at) {
          void syncZReportAfterOrder(o.tenant_slug, o.created_at)
        }
        continue
      }
      if (isDuplicateKassaClientUuidError(error)) {
        const o = order as { tenant_slug?: string; created_at?: string }
        if (o.tenant_slug && o.created_at) {
          void syncZReportAfterOrder(o.tenant_slug, o.created_at)
        }
        continue
      }
      remaining.push(order)
    }
    try {
      await offlineDbSetOrderQueue(tenantSlug, remaining)
      localStorage.setItem(offlineQueueKey, JSON.stringify(remaining))
    } catch {
      /* ignore */
    }
  }

  try {
    if ('locks' in navigator) {
      await (navigator as Navigator & { locks: LockManager }).locks.request(
        `vysion_queue_${tenantSlug}`,
        processQueue,
      )
    } else {
      await processQueue()
    }
  } catch {
    /* empty */
  }
}

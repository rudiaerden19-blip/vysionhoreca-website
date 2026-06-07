import { mergeOfflineOrderQueueRows } from '@/lib/kassa-offline-order-queue-merge'
import { isDuplicateGksKassaClientViolation } from '@/lib/gks-kassa/commercial-orders-client'
import { gksCommercialOrders } from '@/lib/gks-kassa/commercial-orders-client'
import {
  offlineDbGetOrderQueue,
  offlineDbSetOrderQueue,
} from '@/lib/gks-kassa/offline-db'
import { gksOfflineOrdersQueueStorageKey } from '@/lib/gks-kassa/storage-keys'

export function offlineOrdersQueueStorageKey(tenantSlug: string): string {
  return gksOfflineOrdersQueueStorageKey(tenantSlug)
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
  const merged = mergeOfflineOrderQueueRows(fromLs, fromIdb)
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
      const row = order as Record<string, unknown>
      const insRes = await gksCommercialOrders.insert<{ id?: string }>(tenantSlug, row, 'id')
      if (insRes.ok) continue
      if (isDuplicateGksKassaClientViolation(insRes.error)) continue
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
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      await (navigator as Navigator & { locks: LockManager }).locks.request(
        `vysion_gks_queue_${tenantSlug}`,
        processQueue,
      )
    } else {
      await processQueue()
    }
  } catch {
    /* empty */
  }
}

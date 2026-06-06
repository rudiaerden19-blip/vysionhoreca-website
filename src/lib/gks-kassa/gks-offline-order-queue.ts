import { mergeOfflineOrderQueueRows } from '@/lib/kassa-offline-order-queue-merge'
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

/** Stap 1: geen commerciële mirror — queue flush uit. */
export async function flushOfflineOrdersToSupabase(_tenantSlug: string): Promise<void> {
  return
}

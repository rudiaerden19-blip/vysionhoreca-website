/**
 * Offline order queue — alleen IndexedDB; flush naar Supabase (geen localStorage).
 */

import {
  offlineDbGetOrderQueue,
  offlineDbSetOrderQueue,
} from '@/lib/kassa-offline-db'
import { mergeOfflineOrderQueueRows } from '@/lib/kassa-offline-order-queue-merge'
import {
  isDuplicateKassaClientViolation,
} from '@/lib/kassa-supabase-guards'
import { syncZReportAfterOrderSafe } from '@/lib/kassa-z-sync-safe'
import { adminDb } from '@/lib/admin-db-client'

export function offlineOrdersQueueStorageKey(tenantSlug: string): string {
  return `vysion_offline_orders_${tenantSlug}`
}

export async function mergeOfflineOrderQueues(tenantSlug: string): Promise<object[]> {
  let fromIdb: object[] = []
  try {
    fromIdb = await offlineDbGetOrderQueue(tenantSlug)
  } catch {
    fromIdb = []
  }
  return fromIdb
}

export async function flushOfflineOrdersToSupabase(tenantSlug: string): Promise<void> {
  const processQueue = async () => {
    const freshQueue = await mergeOfflineOrderQueues(tenantSlug)
    if (freshQueue.length === 0) return

    const remaining: object[] = []
    for (const order of freshQueue) {
      const row = order as Record<string, unknown>
      const insRes = await adminDb.insert('orders', row, { tenantSlug: tenantSlug })
      if (insRes.ok) {
        const o = order as { tenant_slug?: string; created_at?: string }
        if (o.tenant_slug && o.created_at) {
          syncZReportAfterOrderSafe(o.tenant_slug, o.created_at)
        }
        continue
      }
      if (isDuplicateKassaClientViolation(insRes.error)) {
        const o = order as { tenant_slug?: string; created_at?: string }
        if (o.tenant_slug && o.created_at) {
          syncZReportAfterOrderSafe(o.tenant_slug, o.created_at)
        }
        continue
      }
      remaining.push(order)
    }
    try {
      await offlineDbSetOrderQueue(tenantSlug, remaining)
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

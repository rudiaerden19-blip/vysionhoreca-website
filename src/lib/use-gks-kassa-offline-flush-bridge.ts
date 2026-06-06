'use client'

import { useEffect, type MutableRefObject } from 'react'
import { flushOfflineOrdersToSupabase } from '@/lib/gks-kassa/gks-offline-order-queue'

export function useGksKassaOfflineFlushBridge(
  tenant: string,
  flushOfflineOrdersRef: MutableRefObject<() => Promise<void>>,
): void {
  useEffect(() => {
    flushOfflineOrdersRef.current = () => flushOfflineOrdersToSupabase(tenant)
  }, [tenant, flushOfflineOrdersRef])

  useEffect(() => {
    const onOnline = () => void flushOfflineOrdersRef.current()
    window.addEventListener('online', onOnline)
    void flushOfflineOrdersRef.current()
    return () => window.removeEventListener('online', onOnline)
  }, [tenant, flushOfflineOrdersRef])

  useEffect(() => {
    const sw = navigator.serviceWorker
    if (!sw?.addEventListener) return
    const handler = (ev: MessageEvent) => {
      if (ev.data?.type === 'VYSION_FLUSH_OFFLINE_ORDERS') void flushOfflineOrdersRef.current()
    }
    sw.addEventListener('message', handler as EventListener)
    return () => sw.removeEventListener('message', handler as EventListener)
  }, [flushOfflineOrdersRef])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return
    void navigator.storage.persist().catch(() => {})
  }, [tenant])
}

'use client'

import { useEffect, type MutableRefObject } from 'react'
import { flushOfflineOrdersToSupabase } from '@/lib/kassa-offline-order-queue'

/** Offline-queue flush: ref bijwerken + online reconnect + service worker postMessage + storage persist. */
export function useKassaOfflineFlushBridge(
  tenant: string,
  flushOfflineOrdersRef: MutableRefObject<() => Promise<void>>,
): void {
  useEffect(() => {
    flushOfflineOrdersRef.current = () => flushOfflineOrdersToSupabase(tenant)
  }, [tenant])

  useEffect(() => {
    const onOnline = () => void flushOfflineOrdersRef.current()
    window.addEventListener('online', onOnline)
    void flushOfflineOrdersRef.current()
    return () => window.removeEventListener('online', onOnline)
  }, [tenant])

  useEffect(() => {
    const sw = navigator.serviceWorker
    if (!sw?.addEventListener) return
    const handler = (ev: MessageEvent) => {
      if (ev.data?.type === 'VYSION_FLUSH_OFFLINE_ORDERS') void flushOfflineOrdersRef.current()
    }
    sw.addEventListener('message', handler as EventListener)
    return () => sw.removeEventListener('message', handler as EventListener)
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return
    void navigator.storage.persist().catch(() => {})
  }, [tenant])
}

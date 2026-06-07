'use client'

import { useEffect, useRef, useState } from 'react'

const PING_INTERVAL_MS = 30_000
const PING_TIMEOUT_MS = 10_000
/** Voorkomt flikker: één mislukte ping ≠ meteen offline. */
const OFFLINE_AFTER_CONSECUTIVE_FAILURES = 2

async function pingServerReachable(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS)
  try {
    const res = await fetch('/api/ping', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      signal: ctrl.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

/**
 * Stabiele online-indicator voor kassa/GKS: geen optimistische flip, hysteresis bij ping-fouten.
 */
export function useKassaServerOnline(_tenantSlug: string): boolean | null {
  const [online, setOnline] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null
    return navigator.onLine ? true : false
  })
  const failStreakRef = useRef(0)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true

    const applyResult = (ok: boolean) => {
      if (!aliveRef.current) return
      if (ok) {
        failStreakRef.current = 0
        setOnline(true)
        return
      }
      failStreakRef.current += 1
      if (failStreakRef.current >= OFFLINE_AFTER_CONSECUTIVE_FAILURES) {
        setOnline(false)
      }
    }

    const check = async () => {
      applyResult(await pingServerReachable())
    }

    const onBrowserOffline = () => {
      failStreakRef.current = OFFLINE_AFTER_CONSECUTIVE_FAILURES
      setOnline(false)
    }

    const onBrowserOnline = () => {
      void check()
    }

    window.addEventListener('offline', onBrowserOffline)
    window.addEventListener('online', onBrowserOnline)
    void check()
    const intervalId = window.setInterval(() => void check(), PING_INTERVAL_MS)

    return () => {
      aliveRef.current = false
      window.clearInterval(intervalId)
      window.removeEventListener('offline', onBrowserOffline)
      window.removeEventListener('online', onBrowserOnline)
    }
  }, [_tenantSlug])

  return online
}

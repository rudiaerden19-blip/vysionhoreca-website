'use client'

import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'vysion_kassa_build_sha'

/** Na Vercel-deploy: oude _next/static uit SW-cache + één keer hard reload (Electron-kassa). */
export function KassaDeploySync() {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const build =
      typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BUILD_SHA
        ? String(process.env.NEXT_PUBLIC_BUILD_SHA)
        : ''
    if (!build || build === 'local') return

    let prev: string | null = null
    try {
      prev = localStorage.getItem(STORAGE_KEY)
    } catch {
      /* private mode */
    }

    const bumpStored = () => {
      try {
        localStorage.setItem(STORAGE_KEY, build)
      } catch {
        /* ignore */
      }
    }

    if (prev && prev !== build) {
      bumpStored()
      void (async () => {
        try {
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations()
            await Promise.all(regs.map((r) => r.unregister()))
          }
          if ('caches' in window) {
            const keys = await caches.keys()
            await Promise.all(keys.map((k) => caches.delete(k)))
          }
        } catch {
          /* best-effort */
        }
        window.location.reload()
      })()
      return
    }

    bumpStored()
    void navigator.serviceWorker?.register('/sw.js').then((reg) => reg.update()).catch(() => {})
  }, [])

  return null
}

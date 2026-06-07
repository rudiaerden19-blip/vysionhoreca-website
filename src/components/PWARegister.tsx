'use client'

import { useEffect } from 'react'

/** Na deploy: nieuwe sw.js ophalen + bij terugkeren naar tab — gelijk UI op alle werkstations. */
function bumpServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  void navigator.serviceWorker
    .register('/sw.js?v=17')
    .then((reg) => reg.update())
    .catch(() => { /* ignore */ })
}

export function PWARegister() {
  useEffect(() => {
    bumpServiceWorker()

    const onActive = () => {
      if (document.visibilityState === 'visible') bumpServiceWorker()
    }
    window.addEventListener('focus', onActive)
    document.addEventListener('visibilitychange', onActive)

    return () => {
      window.removeEventListener('focus', onActive)
      document.removeEventListener('visibilitychange', onActive)
    }
  }, [])

  return null
}

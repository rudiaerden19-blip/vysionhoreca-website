'use client'

import { useEffect } from 'react'

/**
 * Homepage: bij refresh altijd bovenaan (geen scroll-restore midden op #prijzen).
 * Hash-links (Prijzen in nav) blijven werken bij normale navigatie, niet bij reload.
 */
export default function HomeScrollOnLoad() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    if ('scrollRestoration'in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    const applyScroll = () => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      const isReload = navEntry?.type === 'reload'

      if (isReload) {
        const cleanUrl = `${window.location.pathname}${window.location.search}`
        if (window.location.hash) {
          window.history.replaceState(null, '', cleanUrl)
        }
        window.scrollTo(0, 0)
        return
      }

      const hash = window.location.hash
      if (hash.length > 1) {
        const target = document.getElementById(hash.slice(1))
        if (target) {
          target.scrollIntoView({ block: 'start', behavior: 'auto'})
          return
        }
      }

      window.scrollTo(0, 0)
    }

    applyScroll()
    const id = window.requestAnimationFrame(() => {
      applyScroll()
    })
    const t = window.setTimeout(applyScroll, 50)

    return () => {
      window.cancelAnimationFrame(id)
      window.clearTimeout(t)
    }
  }, [])

  return null
}

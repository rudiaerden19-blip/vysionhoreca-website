'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Don't track admin/superadmin pages
    if (pathname?.includes('/admin') || pathname?.includes('/superadmin')) {
      return
    }

    // Track page view
    const trackView = async () => {
      try {
        await fetch('/api/track-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page_path: pathname,
            referrer: document.referrer || null
          })
        })
      } catch (error) {
        // Silently fail - analytics shouldn't break the site
        console.debug('Failed to track view:', error)
      }
    }

    trackView()
  }, [pathname])

  return null // This component doesn't render anything
}

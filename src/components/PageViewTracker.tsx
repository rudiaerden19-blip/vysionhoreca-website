'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { safeSessionStorageGet, safeSessionStorageSet } from '@/lib/safe-browser-storage'

export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Don't track internal pages
    const excludedPaths = ['/admin', '/superadmin', '/dashboard', '/keuken', '/login', '/registreer']
    if (excludedPaths.some(path => pathname?.includes(path))) {
      return
    }

    const sessionKey = `tracked_${pathname}`
    if (safeSessionStorageGet(sessionKey)) {
      return
    }

    // Track page view
    const trackView = async () => {
      try {
        const response = await fetch('/api/track-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json'},
          body: JSON.stringify({
            page_path: pathname,
            referrer: document.referrer || null
          })
        })
        
        // Mark as tracked in session if successful
        if (response.ok) {
          safeSessionStorageSet(sessionKey, 'true')
        }
      } catch (error) {
        // Silently fail - analytics shouldn't break the site
        console.debug('Failed to track view:', error)
      }
    }

    trackView()
  }, [pathname])

  return null // This component doesn't render anything
}

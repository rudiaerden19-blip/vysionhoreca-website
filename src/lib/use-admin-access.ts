'use client'

import { useState, useEffect } from 'react'

export interface AdminAccess {
  isOwner: boolean
  isDemo: boolean
  loading: boolean
}

/**
 * Hook om te checken of de huidige gebruiker eigenaar is van de tenant.
 * - isOwner: true = kan alles aanpassen
 * - isDemo: true = kan alleen kijken (read-only mode)
 */
export function useAdminAccess(tenantSlug: string): AdminAccess {
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('vysion_tenant')
      if (stored) {
        const tenant = JSON.parse(stored)
        if (tenant.tenant_slug === tenantSlug) {
          setIsOwner(true)
        }
      }
    } catch (e) {
      console.error('Error checking admin access:', e)
    }
    setLoading(false)
  }, [tenantSlug])

  return {
    isOwner,
    isDemo: !isOwner,
    loading
  }
}
